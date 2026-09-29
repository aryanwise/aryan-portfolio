# Demystifying Linear Regression: From Scratch in 13 Lines

Most introductions to machine learning reach straight for libraries like `scikit-learn` or `PyTorch`. While practical for production, black-box abstractions hide what learning actually is: **a continuous mathematical optimization problem.**

Let's break down linear regression from absolute scratch using nothing but vanilla Python and basic calculus.

---

## 1. The Core Objective

We are given a sequence of inputs $x$ and target values $y$:

```python
xs = [1, 2, 3, 4, 5, 6, 7, 8]
ys = [2.9, 3.4, 4.9, 4.7, 6.2, 6.9, 7.3, 8.6]

```

Our goal is to find a straight line that best fits these points:

$$\hat{y} = w \cdot x + b$$

- $w$ (**weight** or slope): Controls how steep the line is.
- $b$ (**bias** or y-intercept): Shifts the line up or down.
- $\hat{y}$ (**prediction**): The model's guess for a given $x$.

At the beginning, we have no idea what $w$ and $b$ should be, so we initialize them to zero:

```python
w, b = 0.0, 0.0

```

---

## 2. Measuring Error: Mean Squared Error (MSE)

To improve our line, we must mathematically define how bad our current guess is. We use **Mean Squared Error (MSE)** across $N$ data points:

$$L = \frac{1}{N} \sum_{i=1}^{N} (\hat{y}_i - y_i)^2$$

Where the residual error for a single sample is:

$$\text{err}_i = \hat{y}_i - y_i = (w \cdot x_i + b) - y_i$$

### Why square the error?

1. It ensures all errors are positive (positive and negative errors don't cancel each other out).
2. It penalizes large misses much more severely than small misses.
3. It creates a smooth, convex parabola that is easy to differentiate.

---

## 3. The Calculus: Gradient Descent

We want to nudge $w$ and $b$ in the direction that minimizes $L$. In calculus, the derivative tells us the slope of the loss function. Using the chain rule:

### Derivative with respect to weight ($w$):

$$\frac{\partial L}{\partial w} = \frac{1}{N} \sum_{i=1}^{N} \frac{\partial}{\partial w} (\hat{y}_i - y_i)^2$$

$$\frac{\partial L}{\partial w} = \frac{2}{N} \sum_{i=1}^{N} (\hat{y}_i - y_i) \cdot x_i$$

### Derivative with respect to bias ($b$):

$$\frac{\partial L}{\partial b} = \frac{1}{N} \sum_{i=1}^{N} \frac{\partial}{\partial b} (\hat{y}_i - y_i)^2$$

$$\frac{\partial L}{\partial b} = \frac{2}{N} \sum_{i=1}^{N} (\hat{y}_i - y_i)$$

Notice the direct correspondence between the math and the code:

```python
dw += 2 * err * x / len(xs)
db += 2 * err / len(xs)

```

---

## 4. The Parameter Update

The gradient points uphill (toward higher loss). Because we want to minimize loss, we take a step in the **opposite direction** of the gradient scaled by a small step size called the **learning rate** ($lr$):

$$w \leftarrow w - \eta \cdot \frac{\partial L}{\partial w}$$

$$b \leftarrow b - \eta \cdot \frac{\partial L}{\partial b}$$

In code:

```python
w -= lr * dw
b -= lr * db

```

If $lr$ is too large, the updates will overshoot and explode. If $lr$ is too small, convergence will be slow. A value of `0.01` provides steady convergence here.

---

## 5. The Full Implementation

Combining every step into a single batch gradient descent loop:

```python
xs = [1, 2, 3, 4, 5, 6, 7, 8]
ys = [2.9, 3.4, 4.9, 4.7, 6.2, 6.9, 7.3, 8.6]
w, b = 0.0, 0.0
lr = 0.01

for epoch in range(1000):
    dw, db = 0.0, 0.0
    for x, y in zip(xs, ys):
        pred = w * x + b
        err = pred - y
        dw += 2 * err * x / len(xs)
        db += 2 * err / len(xs)
    w -= lr * dw
    b -= lr * db

print(f"Optimal parameters: w = {w:.4f}, b = {b:.4f}")

```

After 1,000 iterations, the model converges to roughly $w \approx 0.81$ and $b \approx 2.05$.

This 13-line loop contains the foundational algorithm driving modern deep learning: forward pass, error measurement, backpropagation via analytical gradients, and weight updates.
