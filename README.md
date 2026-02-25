# Fat-Tree & Google Jupiter Network Simulator

Two tools for analysing data centre network topologies:

1. **Python Script (`Assignment1.py`)** — Fat-Tree calculations for Questions 5a–5c
2. **JavaScript Visualiser** — Interactive scaled-down Google Jupiter (5-stage Clos) simulator

---

## How to Run

```bash
# Fat-Tree calculations (Q5a–5c)
python3 Assignment1.py

# Jupiter visualiser — open http://localhost:8000
python3 -m http.server 8000
```

---

## Jupiter Visualiser

Interactive controls for Radix (K), AB Count, Core Switches, Split-Core Span, Link Speed, and Rail Layout.

### Metrics Calculations

| Metric | Formula |
|---|---|
| Total Hosts | `abCount × (K/2) × (K/2)` |
| Path Redundancy | `coreCount` paths |
| Bisection BW | `⌊abCount/2⌋ × (K/2) × splitSpan × linkSpeed` Gbps |

---

## Authors

**He "Lonnie" Liu** and **Yu Quan Ang**

