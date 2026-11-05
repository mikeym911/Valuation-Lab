
import numpy as np


def _crr_tree(spot, strike, T, r, sigma, N, q, kind, american):
    """CRR option price and first two levels of the rolled-back tree."""
    if not (
        np.isfinite([spot, strike, T, r, sigma, q]).all()
        and spot > 0 and strike > 0 and T > 0 and sigma > 0
    ):
        raise ValueError("Invalid option inputs.")

    if N < 3:
        raise ValueError("Use at least 3 lattice steps.")

    dt = T / N
    u = np.exp(sigma * np.sqrt(dt))
    d = 1 / u
    growth = np.exp((r - q) * dt)
    p = (growth - d) / (u - d)

    if not (d < growth < u and 0 < p < 1):
        raise ValueError("CRR no-arbitrage condition failed.")

    disc = np.exp(-r * dt)
    j = np.arange(N + 1)
    stock = spot * u**j * d**(N - j)

    if kind == "call":
        values = np.maximum(stock - strike, 0)
    elif kind == "put":
        values = np.maximum(strike - stock, 0)
    else:
        raise ValueError("Option type must be call or put.")

    first = second = None

    for n in range(N - 1, -1, -1):
        values = disc * (
            p * values[1:n + 2] + (1 - p) * values[:n + 1]
        )

        if american:
            j = np.arange(n + 1)
            stock = spot * u**j * d**(n - j)
            intrinsic = (
                np.maximum(stock - strike, 0)
                if kind == "call"
                else np.maximum(strike - stock, 0)
            )
            values = np.maximum(values, intrinsic)

        if n == 2:
            second = values.copy()
        elif n == 1:
            first = values.copy()

    return float(values[0]), first, second, u, d, dt


def calculate_greeks(model, spot=None):
    """Calculate five CRR Greeks, all on a per-share basis."""
    S = float(model["spot"] if spot is None else spot)
    K = float(model["strike"])
    T = float(model["maturity_years"])
    r = float(model["risk_free_rate"])
    sigma = float(model["volatility"])
    N = int(model["lattice_steps"])
    q = float(model["dividend_yield"])
    kind = str(model["option_type"]).lower()
    american = str(model["exercise_style"]).lower() == "american"

    def tree(sig=sigma, rate=r):
        return _crr_tree(S, K, T, rate, sig, N, q, kind, american)

    price, first, second, u, d, dt = tree()

    # First-order stock-price sensitivity
    delta = (first[1] - first[0]) / (S * u - S * d)

    # Second-order stock-price sensitivity
    delta_up = (second[2] - second[1]) / (S * u**2 - S)
    delta_down = (second[1] - second[0]) / (S - S * d**2)
    gamma = (delta_up - delta_down) / (
        (S * u**2 - S * d**2) / 2
    )

    # Time decay per calendar day
    theta = (second[1] - price) / (2 * dt * 365)

    # Sensitivity per 1 percentage-point volatility change
    bump = min(0.01, sigma / 2)
    vol_up = tree(sig=sigma + bump)[0]
    vol_down = tree(sig=sigma - bump)[0]
    vega = (vol_up - vol_down) * 0.01 / (2 * bump)

    # Sensitivity per 1 percentage-point interest-rate change
    rate_up = tree(rate=r + 0.01)[0]
    rate_down = tree(rate=r - 0.01)[0]
    rho = (rate_up - rate_down) / 2

    return {
        "price": float(price),
        "delta": float(delta),
        "gamma": float(gamma),
        "theta": float(theta),
        "vega": float(vega),
        "rho": float(rho),
    }


def greek_curve(model, points=41):
    """Generate Greek curves across stock prices from -30% to +30%."""
    S = float(model["spot"])
    return [
        {"spot": float(x), **calculate_greeks(model, float(x))}
        for x in np.linspace(0.70 * S, 1.30 * S, points)
    ]
