from pathlib import Path
import json, numpy as np, pandas as pd
ROOT=Path.cwd(); DATA=ROOT/'data'; DOCS=ROOT/'docs'; DOCS.mkdir(exist_ok=True)
inputs=pd.read_csv(DATA/'company_inputs.csv')
if len(inputs)!=1: raise ValueError('company_inputs.csv must contain exactly one firm row.')
M=inputs.iloc[0].to_dict()
for k in ['spot','strike','maturity_years','risk_free_rate','dividend_yield','volatility','market_bid','market_ask','dcf_value','comps_value']: M[k]=float(M[k])
M['lattice_steps']=int(M['lattice_steps']); M['market_mid']=(M['market_bid']+M['market_ask'])/2
M['option_type']=str(M['option_type']).lower(); M['exercise_style']=str(M['exercise_style']).lower()
if not 0<=M['risk_free_rate']<=1: raise ValueError('risk_free_rate must be a decimal.')
if not 0<M['volatility']<=3: raise ValueError('volatility must be a decimal.')
if M['market_bid']>M['market_ask']: raise ValueError('market_bid cannot exceed market_ask.')
if M['option_type'] not in ['call','put']: raise ValueError('option_type must be call or put.')
if M['exercise_style'] not in ['european','american']: raise ValueError('exercise_style must be european or american.')
targets=pd.read_csv(DATA/'analyst_targets.csv')
if len(targets)<5 or not targets.target.gt(0).all(): raise ValueError('At least five positive analyst targets are required.')
if targets.horizon_months.nunique()!=1: raise ValueError('All analyst targets must use one horizon.')

def payoff(stock,strike,kind):
    stock=np.asarray(stock,float); return np.maximum(stock-strike,0) if kind=='call' else np.maximum(strike-stock,0)
def crr(spot,strike,T,r,sigma,N,q=0,kind='call',american=False,tree_steps=3):
    dt=T/N; u=np.exp(sigma*np.sqrt(dt)); d=1/u; growth=np.exp((r-q)*dt); p=(growth-d)/(u-d); disc=np.exp(-r*dt)
    if not(d<growth<u and 0<p<1): raise ValueError('No-arbitrage condition failed.')
    j=np.arange(N+1); stock=spot*u**j*d**(N-j); values=payoff(stock,strike,kind)
    for n in range(N-1,-1,-1):
        values=disc*(p*values[1:n+2]+(1-p)*values[:n+1])
        if american:
            j=np.arange(n+1); stock=spot*u**j*d**(n-j); values=np.maximum(values,payoff(stock,strike,kind))
    # small instructional tree
    n=tree_steps; dts=T/n; us=np.exp(sigma*np.sqrt(dts)); ds=1/us; ps=(np.exp((r-q)*dts)-ds)/(us-ds); discs=np.exp(-r*dts)
    stock_tree=[[float(spot*us**j*ds**(i-j)) for j in range(i+1)] for i in range(n+1)]
    opt=[float(x) for x in payoff(stock_tree[-1],strike,kind)] ; option_tree=[None]*(n+1); option_tree[n]=opt[:]
    for i in range(n-1,-1,-1):
        opt=[float(discs*(ps*opt[j+1]+(1-ps)*opt[j])) for j in range(i+1)]; option_tree[i]=opt[:]
    return {'price':float(values[0]),'u':float(u),'d':float(d),'p_star':float(p),'dt':float(dt),'stock_tree':stock_tree,'option_tree':option_tree}

stats={'count':int(len(targets)),'mean':float(targets.target.mean()),'median':float(targets.target.median()),'std':float(targets.target.std(ddof=1)),'min':float(targets.target.min()),'max':float(targets.target.max()),'q1':float(targets.target.quantile(.25)),'q3':float(targets.target.quantile(.75))}
valuation={'Current market':M['spot'],'Comparable companies':M['comps_value'],'Student DCF':M['dcf_value'],'Analyst median':stats['median']}
qm={'Severe bear':.05,'Bear':.25,'Base':.50,'Bull':.75,'Tail':.95}; weights={'Severe bear':.10,'Bear':.20,'Base':.40,'Bull':.20,'Tail':.10}
states=pd.DataFrame({'state':list(qm),'quantile':list(qm.values()),'terminal_price':[float(targets.target.quantile(q)) for q in qm.values()],'subjective_weight':[weights[k] for k in qm]})
states['option_payoff']=payoff(states.terminal_price,M['strike'],M['option_type']); states['weighted_payoff']=states.subjective_weight*states.option_payoff
DF=float(np.exp(-M['risk_free_rate']*M['maturity_years'])); states['discounted_contribution']=DF*states.weighted_payoff
belief=float(states.discounted_contribution.sum()); lattice=crr(M['spot'],M['strike'],M['maturity_years'],M['risk_free_rate'],M['volatility'],M['lattice_steps'],M['dividend_yield'],M['option_type'],M['exercise_style']=='american')
pvs=M['spot']*np.exp(-M['dividend_yield']*M['maturity_years']); pvk=M['strike']*np.exp(-M['risk_free_rate']*M['maturity_years']); lo,hi=(max(pvs-pvk,0),pvs) if M['option_type']=='call' else (max(pvk-pvs,0),pvk)
call=crr(M['spot'],M['strike'],M['maturity_years'],M['risk_free_rate'],M['volatility'],M['lattice_steps'],M['dividend_yield'],'call')['price']; put=crr(M['spot'],M['strike'],M['maturity_years'],M['risk_free_rate'],M['volatility'],M['lattice_steps'],M['dividend_yield'],'put')['price']
parity=float((call-put)-(pvs-pvk)); steps=[25,50,100,200,500]; conv=[crr(M['spot'],M['strike'],M['maturity_years'],M['risk_free_rate'],M['volatility'],n,M['dividend_yield'],M['option_type'])['price'] for n in steps]
validation={'valid_risk_neutral_probability':bool(0<lattice['p_star']<1),'inside_theoretical_bounds':bool(lo<=lattice['price']<=hi),'put_call_parity_pass':bool(abs(parity)<.05),'convergence_pass':bool(abs(conv[-1]-conv[-2])<.05),'parity_residual':parity,'convergence_gap':float(conv[-1]-conv[-2]),'lower_bound':float(lo),'upper_bound':float(hi),'tolerance':.05}
sigmas=np.linspace(max(.05,M['volatility']-.15),M['volatility']+.15,25); sensitivity=[{'volatility':float(x),'price':crr(M['spot'],M['strike'],M['maturity_years'],M['risk_free_rate'],float(x),M['lattice_steps'],M['dividend_yield'],M['option_type'])['price']} for x in sigmas]
results={'model':M,'analyst_targets':[float(x) for x in targets.target],'analyst_stats':stats,'valuation':valuation,'states':states.to_dict('records'),'valuation_weighted_expected_payoff':belief,'belief_decomposition':{'weight_zero_payoff':float(states.loc[states.option_payoff==0,'subjective_weight'].sum()),'weight_positive_payoff':float(states.loc[states.option_payoff>0,'subjective_weight'].sum()),'weighted_terminal_payoff':float(states.weighted_payoff.sum()),'discount_factor':DF},'lattice':lattice,'validation':validation,'convergence':[{'steps':n,'price':float(x)} for n,x in zip(steps,conv)],'comparison':{'Analyst scenario':belief,'CRR lattice':lattice['price'],'Market midpoint':M['market_mid']},'sensitivity':sensitivity}
(DOCS/'model_results.json').write_text(json.dumps(results,indent=2))
print('Exported docs/model_results.json')
