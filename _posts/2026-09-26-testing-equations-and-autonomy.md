---
layout: post
title: "Testing Equations and Autonomous Logic"
date: 2026-09-26
---

Testing the Markdown pipeline, code formatting, and LaTeX math rendering for autonomous navigation.

## State Transition & Noise

When modeling a differential drive vehicle under sensor noise, the discrete-time state update is represented as:

$$x_k = F_k x_{k-1} + B_k u_k + w_k$$

Where:

- $x_k$ is the state vector $[\text{x}, \text{y}, \theta]^T$
- $u_k$ is the control input $[v, \omega]^T$
- $w_k \sim \mathcal{N}(0, Q_k)$ represents process covariance

For measurement updates from ultrasonic pings or lidar points:

$$z_k = H_k x_k + v_k$$

$$\text{Kalman Gain: } K_k = P_k^- H_k^T (H_k P_k^- H_k^T + R_k)^{-1}$$

## State Verification Snippet

A straightforward matrix update loop in Python:

```python
import numpy as np

def predict_step(x, P, F, Q, u=None, B=None):
    # State extrapolation
    x_prior = F @ x + (B @ u if B is not None else 0)
    # Covariance extrapolation
    P_prior = F @ P @ F.T + Q
    return x_prior, P_prior
```
