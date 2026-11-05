const $=s=>document.querySelector(s),money=x=>'$'+Number(x).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
let BASE;fetch('model_results.json',{cache:'no-store'}).then(r=>r.json()).then(d=>{BASE=d;render(structuredClone(d))}).catch(e=>$('#app').innerHTML='<section class="card">Dashboard unavailable: '+e.message+'</section>');
function payoff(s,k,t){return t==='call'?Math.max(s-k,0):Math.max(k-s,0)}
function crr(S,K,T,r,sig,N,q,type){let dt=T/N,u=Math.exp(sig*Math.sqrt(dt)),dn=1/u,p=(Math.exp((r-q)*dt)-dn)/(u-dn),disc=Math.exp(-r*dt);if(!(p>0&&p<1))throw Error('No-arbitrage probability is outside (0,1).');let a=Array.from({length:N+1},(_,j)=>payoff(S*u**j*dn**(N-j),K,type));for(let n=N-1;n>=0;n--)a=Array.from({length:n+1},(_,j)=>disc*(p*a[j+1]+(1-p)*a[j]));return {price:a[0],u,d:dn,p_star:p,dt}}
function recalc(){let d=structuredClone(BASE),m=d.model;for(let x of ['spot','strike','maturity_years','risk_free_rate','dividend_yield','volatility','market_bid','market_ask'])m[x]=Number($('#'+x).value);m.market_mid=(m.market_bid+m.market_ask)/2;if(m.market_bid>m.market_ask)return alert('Bid cannot exceed ask.');d.states.forEach(z=>{z.option_payoff=payoff(z.terminal_price,m.strike,m.option_type);z.weighted_payoff=z.subjective_weight*z.option_payoff;z.discounted_contribution=Math.exp(-m.risk_free_rate*m.maturity_years)*z.weighted_payoff});d.valuation_weighted_expected_payoff=d.states.reduce((a,z)=>a+z.discounted_contribution,0);d.lattice={...d.lattice,...crr(m.spot,m.strike,m.maturity_years,m.risk_free_rate,m.volatility,m.lattice_steps,m.dividend_yield,m.option_type)};d.comparison={'Analyst scenario':d.valuation_weighted_expected_payoff,'CRR lattice':d.lattice.price,'Market midpoint':m.market_mid};render(d)}
function render(d){let m=d.model,s=d.states,v=d.validation;$('#meta').textContent=`${m.company} · ${m.ticker} | ${m.exercise_style} ${m.option_type} | ${m.lattice_steps}-step CRR`;let k=[['Current price',m.spot],['Student DCF',m.dcf_value],['Analyst mean',d.analyst_stats.mean],['Strike',m.strike],['CRR value',d.lattice.price],['Market midpoint',m.market_mid]];$('#app').innerHTML=`<section class="grid">${k.map(x=>`<article class="card kpi"><span class="sub">${x[0]}</span><b>${money(x[1])}</b></article>`).join('')}
<article class="card span12"><h2>Input lab</h2><p class="sub">Change assumptions locally. Analyst-informed weights remain separate from the CRR risk-neutral probability.</p><div class="controls">${[['spot','Spot'],['strike','Strike'],['maturity_years','Years'],['risk_free_rate','Risk-free rate'],['dividend_yield','Dividend yield'],['volatility','Volatility'],['market_bid','Market bid'],['market_ask','Market ask']].map(x=>`<label>${x[1]}<input id="${x[0]}" type="number" step="any" value="${m[x[0]]}"></label>`).join('')}<label>Option type<select id="option_type"><option>${m.option_type}</option></select></label><button class="button" type="button" id="calc">Recalculate</button><button class="button alt" type="button" id="reset">Reset case</button></div></article>
<article class="card span6"><h2>Equity valuation</h2><p class="sub">Current price and independent estimates</p><div id="valuation" class="plot"></div></article><article class="card span6"><h2>Analyst target distribution</h2><p class="sub">Belief evidence, not risk-neutral probabilities</p><div id="distribution" class="plot"></div></article>
<article class="card span8"><h2>Five-state payoff construction</h2><div class="formula">Payoff = max(S<sub>T</sub> − K, 0); subjective value = e<sup>−rT</sup> Σ w<sub>i</sub> payoff<sub>i</sub></div><table><thead><tr><th>State</th><th>Terminal price</th><th>Weight</th><th>Payoff</th><th>Discounted contribution</th></tr></thead><tbody>${s.map(z=>`<tr><td>${z.state}</td><td>${money(z.terminal_price)}</td><td>${(100*z.subjective_weight).toFixed(0)}%</td><td>${money(z.option_payoff)}</td><td>${money(z.discounted_contribution||0)}</td></tr>`).join('')}</tbody></table></article>
<article class="card span4"><h2>Comparison</h2><div id="comparison" class="plot"></div></article>
<article class="card span6"><h2>Volatility sensitivity</h2><p class="sub">CRR value as volatility changes</p><div id="sensitivity" class="plot"></div></article><article class="card span6"><h2>Model audit</h2><div class="audit">${[['Risk-neutral probability',d.lattice.p_star>0&&d.lattice.p_star<1,`p* = ${d.lattice.p_star.toFixed(5)}`],['Theoretical bounds',v.inside_theoretical_bounds,`${money(v.lower_bound)} to ${money(v.upper_bound)}`],['Put-call parity',v.put_call_parity_pass,`Residual ${Number(v.parity_residual).toExponential(2)}`],['Convergence',v.convergence_pass,`Gap ${money(Math.abs(v.convergence_gap))}`]].map(x=>`<div class="test ${x[1]?'':'fail'}"><b>${x[1]?'PASS':'FAIL'}: ${x[0]}</b><br><span class="sub">${x[2]}</span></div>`).join('')}</div><p class="foot">The five analyst states are not branches of the CRR tree.</p></article>
<article class="card span12"><h2>Professional conclusion</h2><div class="memo-fields">${['Primary conclusion','Economic explanation of the gap','Most consequential uncertainty','Numerical reversal condition'].map(x=>`<label>${x}<textarea rows="4" placeholder="Write the ${x.toLowerCase()}..."></textarea></label>`).join('')}</div><p><button class="button" type="button" onclick="window.print()">Print or save as PDF</button></p></article></section>`;
$('#calc').addEventListener('click',recalc);$('#reset').addEventListener('click',()=>render(structuredClone(BASE)));
let cfg={responsive:true,displayModeBar:false};Plotly.newPlot('valuation',[{type:'scatter',mode:'markers+text',x:Object.values(d.valuation),y:Object.keys(d.valuation),text:Object.values(d.valuation).map(money),textposition:'middle right',marker:{size:16,color:['#68798e','#e2a72d','#197ba6','#0fa99d']}}],{margin:{l:150,r:70,t:20,b:50},xaxis:{tickprefix:'$',title:'Equity value per share'},yaxis:{autorange:'reversed'}},cfg);Plotly.newPlot('distribution',[{type:'box',x:d.analyst_targets,orientation:'h',boxpoints:'all',jitter:.4,marker:{color:'#0fa99d'}}],{margin:{l:20,r:20,t:20,b:50},xaxis:{tickprefix:'$',title:'12-month target'},yaxis:{visible:false}},cfg);Plotly.newPlot('comparison',[{type:'bar',x:Object.keys(d.comparison),y:Object.values(d.comparison),text:Object.values(d.comparison).map(money),textposition:'outside',marker:{color:['#0fa99d','#197ba6','#f2762e']}}],{margin:{l:50,r:15,t:30,b:80},yaxis:{tickprefix:'$',rangemode:'tozero'}},cfg);let sens=Array.from({length:25},(_,i)=>Math.max(.05,m.volatility-.15)+i*.3/24).map(x=>({x,y:crr(m.spot,m.strike,m.maturity_years,m.risk_free_rate,x,m.lattice_steps,m.dividend_yield,m.option_type).price}));Plotly.newPlot('sensitivity',[{type:'scatter',mode:'lines',x:sens.map(z=>z.x),y:sens.map(z=>z.y),line:{color:'#197ba6',width:4}}],{margin:{l:55,r:20,t:20,b:55},xaxis:{tickformat:'.0%',title:'Volatility'},yaxis:{tickprefix:'$',title:'CRR value'}},cfg)}

/* ================================================
   OPTIONS GREEKS ADD-ON
   ADD THIS TO THE BOTTOM OF docs/assets/app.js
   ================================================ */

// CRR binomial tree used for Greek calculations.
function greekTreeCalc(
  m,
  spot = Number(m.spot),
  vol = Number(m.volatility),
  rate = Number(m.risk_free_rate)
) {
  const S = Number(spot);
  const K = Number(m.strike);
  const T = Number(m.maturity_years);
  const q = Number(m.dividend_yield);
  const N = Number(m.lattice_steps);
  const american = m.exercise_style === "american";
  const type = m.option_type;

  if (
    ![S, K, T, q, vol, rate].every(Number.isFinite) ||
    S <= 0 || K <= 0 || T <= 0 ||
    vol <= 0 || !Number.isInteger(N) || N < 3
  ) {
    throw new Error(
      "Greeks require positive inputs and at least 3 lattice steps."
    );
  }

  const dt = T / N;
  const u = Math.exp(vol * Math.sqrt(dt));
  const d = 1 / u;
  const growth = Math.exp((rate - q) * dt);
  const p = (growth - d) / (u - d);
  const disc = Math.exp(-rate * dt);

  if (!(d < growth && growth < u && p > 0 && p < 1)) {
    throw new Error("CRR no-arbitrage condition failed.");
  }

  let values = Array.from(
    { length: N + 1 },
    (_, j) => payoff(S * u ** j * d ** (N - j), K, type)
  );

  let first, second;

  for (let n = N - 1; n >= 0; n--) {
    values = Array.from({ length: n + 1 }, (_, j) => {
      const hold = disc * (
        p * values[j + 1] + (1 - p) * values[j]
      );

      const exercise = payoff(
        S * u ** j * d ** (n - j), K, type
      );

      return american ? Math.max(hold, exercise) : hold;
    });

    if (n === 2) second = values.slice();
    if (n === 1) first = values.slice();
  }

  const price = values[0];

  // DELTA - stock-price sensitivity
  const delta = (
    first[1] - first[0]
  ) / (S * u - S * d);

  // GAMMA - change in Delta
  const deltaUp = (
    second[2] - second[1]
  ) / (S * u ** 2 - S);

  const deltaDown = (
    second[1] - second[0]
  ) / (S - S * d ** 2);

  const gamma = (
    deltaUp - deltaDown
  ) / ((S * u ** 2 - S * d ** 2) / 2);

  // THETA - daily time decay
  const theta = (
    second[1] - price
  ) / (2 * dt * 365);

  return { price, delta, gamma, theta };
}

// Calculate all five Greeks.
function getGreeks(m, spot = Number(m.spot)) {
  const base = greekTreeCalc(m, spot);

  const v = Number(m.volatility);
  const r = Number(m.risk_free_rate);
  const volBump = Math.min(0.01, v / 2);

  // VEGA: value change per 1 percentage-point
  // increase in volatility.
  const vega = (
    greekTreeCalc(m, spot, v + volBump).price -
    greekTreeCalc(m, spot, v - volBump).price
  ) * 0.01 / (2 * volBump);

  // RHO: value change per 1 percentage-point
  // increase in the risk-free interest rate.
  const rho = (
    greekTreeCalc(m, spot, v, r + 0.01).price -
    greekTreeCalc(m, spot, v, r - 0.01).price
  ) / 2;

  return {
    ...base,
    vega,
    rho
  };
}

// Build the Greek cards and interactive graphs.
function makeGreekCharts(d) {
  const m = d.model;
  const greeks = getGreeks(m);

  const fmt = x =>
    (x >= 0 ? "+" : "") + x.toFixed(4);

  const grid = document.querySelector("#app .grid");

  // Insert the new dashboard section before
  // the existing Professional conclusion.
  grid.lastElementChild.insertAdjacentHTML(
    "beforebegin",
    `
    <article class="card span12">
      <h2>Options Greeks — CRR Risk Analysis</h2>

      <p class="sub">
        Risk sensitivities from the ${m.lattice_steps}-step
        CRR model. All values are per share.
      </p>

      <div class="greeks-grid">
        ${[
          ["Δ", "Delta", "delta", "Per $1 stock change"],
          ["Γ", "Gamma", "gamma", "Delta change per $1"],
          ["Θ", "Theta", "theta", "Dollars per day"],
          ["ν", "Vega", "vega", "Per +1% volatility"],
          ["ρ", "Rho", "rho", "Per +1% interest rate"]
        ].map(([symbol, title, key, unit]) => `
          <div class="greek-box">
            <div class="greek-name">
              ${symbol} ${title}
            </div>
            <strong>${fmt(greeks[key])}</strong>
            <small>${unit}</small>
          </div>
        `).join("")}
      </div>

      <p class="foot">
        Delta, Gamma and Theta use CRR tree nodes.
        Vega and Rho use symmetric repricing.
        Values are estimates, not guaranteed P&amp;L.
      </p>
    </article>

    <article class="card span6">
      <h2>Greek Sensitivity Explorer</h2>

      <p class="sub">
        See how the Greeks change as the stock
        price moves by plus or minus 30%.
      </p>

      <label class="greek-picker">
        Select Greek:

        <select id="greek-select">
          <option value="delta">Delta</option>
          <option value="gamma">Gamma</option>
          <option value="theta">Theta</option>
          <option value="vega">Vega</option>
          <option value="rho">Rho</option>
        </select>
      </label>

      <div id="greek-chart" class="plot"></div>
    </article>

    <article class="card span6">
      <h2>Delta–Gamma vs. CRR Repricing</h2>

      <p class="sub">
        Compare actual CRR price changes against
        Delta and Delta–Gamma estimates.
      </p>

      <div id="greek-compare" class="plot"></div>
    </article>
    `
  );

  const config = {
    responsive: true,
    displayModeBar: false
  };

  // Create 41 stock-price scenarios.
  const curve = Array.from(
    { length: 41 },
    (_, i) => {
      const spot = Number(m.spot) *
        (0.7 + 0.6 * i / 40);

      return {
        spot,
        ...getGreeks(m, spot)
      };
    }
  );

  // CHART 1 - Greek Sensitivity Explorer
  function drawSelectedGreek() {
    const key = document.querySelector(
      "#greek-select"
    ).value;

    Plotly.newPlot(
      "greek-chart",
      [{
        x: curve.map(row => row.spot),
        y: curve.map(row => row[key]),
        type: "scatter",
        mode: "lines",
        name: key.toUpperCase(),
        line: {
          color: "#197ba6",
          width: 3
        }
      }],
      {
        margin: {
          l: 65,
          r: 20,
          t: 25,
          b: 55
        },
        xaxis: {
          title: "Stock price ($)"
        },
        yaxis: {
          title: key.toUpperCase()
        },
        shapes: [{
          type: "line",
          x0: m.spot,
          x1: m.spot,
          y0: 0,
          y1: 1,
          yref: "paper",
          line: {
            color: "#0fa99d",
            dash: "dash"
          }
        }]
      },
      config
    );
  }

  document.querySelector("#greek-select")
    .addEventListener("change", drawSelectedGreek);

  drawSelectedGreek();

  // CHART 2 - Delta/Gamma approximation
  const moves = Array.from(
    { length: 25 },
    (_, i) => Number(m.spot) *
      (i - 12) * 0.10 / 12
  );

  const actual = moves.map(move =>
    greekTreeCalc(
      m,
      Number(m.spot) + move
    ).price - greeks.price
  );

  const deltaOnly = moves.map(
    move => greeks.delta * move
  );

  const deltaGamma = moves.map(
    move =>
      greeks.delta * move +
      0.5 * greeks.gamma * move ** 2
  );

  Plotly.newPlot(
    "greek-compare",
    [
      {
        x: moves,
        y: actual,
        type: "scatter",
        mode: "lines",
        name: "Actual CRR",
        line: {
          color: "#197ba6",
          width: 3
        }
      },
      {
        x: moves,
        y: deltaOnly,
        type: "scatter",
        mode: "lines",
        name: "Delta only",
        line: {
          color: "#e2a72d",
          dash: "dash"
        }
      },
      {
        x: moves,
        y: deltaGamma,
        type: "scatter",
        mode: "lines",
        name: "Delta + Gamma",
        line: {
          color: "#0fa99d",
          dash: "dot"
        }
      }
    ],
    {
      margin: {
        l: 55,
        r: 15,
        t: 40,
        b: 55
      },
      xaxis: {
        title: "Change in stock price ($)"
      },
      yaxis: {
        title: "Change in option price ($)"
      },
      legend: {
        orientation: "h",
        x: 0,
        y: 1.18
      }
    },
    config
  );
}

// Extend your original dashboard's render function.
// This makes Greeks update on initial load,
// Recalculate, and Reset.
const originalDashboardRender = render;

render = function(data) {
  originalDashboardRender(data);

  try {
    makeGreekCharts(data);
  } catch (error) {
    console.error("Greek dashboard error:", error);

    const grid = document.querySelector("#app .grid");

    if (grid) {
      grid.insertAdjacentHTML(
        "beforeend",
        `<article class="card span12">
          <h2>Greek calculations</h2>
          <p>${error.message}</p>
        </article>`
      );
    }
  }
};
