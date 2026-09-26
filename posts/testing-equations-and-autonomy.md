# State Estimation and Sensor Uncertainty in Small Vehicles

_September 26, 2026_

When taking machine learning off the screen and putting it onto physical hardware, the first thing that breaks is the assumption of clean data. Ultrasonic rangefinders bounce off angled walls, infrared sensors get blinded by sunlight, and cheap DC gear motors slip on wood floors.

To build autonomous machines that move reliably, we have to model that uncertainty mathematically before writing control loops.

---

## 1. Kinematic Model of Differential Drive

Consider a simple two-wheeled chassis with track width $L$ and wheel radius $r$. If the left and right wheel angular velocities are $\omega_L$ and $\omega_R$, the forward linear velocity $v$ and angular velocity $\omega$ are given by:

$$v = \frac{r}{2}(\omega_R + \omega_L)$$

$$\omega = \frac{r}{L}(\omega_R - \omega_L)$$

Over a small discrete time interval $\Delta t$, if the heading angle is $\theta_k$, the dead-reckoning position update follows:

$$\begin{bmatrix} x_{k+1} \\ y_{k+1} \\ \theta_{k+1} \end{bmatrix} = \begin{bmatrix} x_k \\ y_k \\ \theta_k \end{bmatrix} + \begin{bmatrix} v \cos\left(\theta_k + \frac{\omega \Delta t}{2}\right) \Delta t \\ v \sin\left(\theta_k + \frac{\omega \Delta t}{2}\right) \Delta t \\ \omega \Delta t \end{bmatrix}$$

---

## 2. Sensor Fusion with the Discrete Kalman Filter

Odometry drifts quickly due to wheel slip. To correct this, we blend encoder dead-reckoning with periodic sensor measurements (e.g., ultrasonic pings or lidar returns).

The prediction step projects the state forward:

$$\hat{x}_k^- = F_k \hat{x}_{k-1} + B_k u_k$$

$$P_k^- = F_k P_{k-1} F_k^T + Q_k$$

Where:

- $\hat{x}_k^-$ is the prior state estimate
- $P_k^-$ is the prior error covariance
- $Q_k$ is the process noise covariance matrix

When a sensor reading $z_k$ arrives, we compute the Kalman Gain $K_k$ and update the posterior state:

$$K_k = P_k^- H_k^T (H_k P_k^- H_k^T + R_k)^{-1}$$

$$\hat{x}_k = \hat{x}_k^- + K_k (z_k - H_k \hat{x}_k^-)$$

$$P_k = (I - K_k H_k) P_k^-$$

---

## 3. Python Implementation

Here is a minimal 1D state estimator demonstrating the predict-update cycle:

```python
import numpy as np

class ScalarKalmanFilter:
    def __init__(self, process_variance: float, measurement_variance: float):
        self.q = process_variance      # Q
        self.r = measurement_variance  # R
        self.x = 0.0                   # State estimate
        self.p = 1.0                   # Estimate error covariance

    def update(self, measurement: float) -> float:
        # Prediction phase
        p_prior = self.p + self.q

        # Measurement update phase
        kalman_gain = p_prior / (p_prior + self.r)
        self.x = self.x + kalman_gain * (measurement - self.x)
        self.p = (1.0 - kalman_gain) * p_prior

        return self.x

# Quick test with noisy distance measurements
kf = ScalarKalmanFilter(process_variance=0.01, measurement_variance=0.8)
raw_distances = [10.2, 9.8, 11.4, 10.1, 9.7, 10.3]
filtered = [kf.update(z) for z in raw_distances]

print("Filtered trajectory:", np.round(filtered, 2))
```
