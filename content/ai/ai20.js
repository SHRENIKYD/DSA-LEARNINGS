(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small helpers shared by the visualizers ---------- */
  function r3(x) { var v = Math.round(x * 1000) / 1000; return v === 0 ? 0 : v; }        // avoid "-0"
  function r4(x) { var v = Math.round(x * 10000) / 10000; return v === 0 ? 0 : v; }
  function r6(x) { var v = Math.round(x * 1e6) / 1e6; return v === 0 ? 0 : v; }
  function nums(s, name, maxLen) {
    var a = String(s).trim().split(/[\s,]+/).filter(function (t) { return t !== ''; }).map(Number);
    if (!a.length || a.some(function (v) { return !isFinite(v); })) throw new Error('Enter ' + (name || 'numbers') + ' as numbers separated by spaces, e.g. 1 2 3');
    if (a.length > (maxLen || 8)) throw new Error('Use at most ' + (maxLen || 8) + ' numbers for ' + (name || 'this input'));
    return a;
  }
  function splitBar(s, n, hint) {
    var p = String(s).split('|');
    if (p.length !== n) throw new Error('Format: ' + hint);
    return p;
  }
  function sig(z) { return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)); }
  function poly(c, x) { return c.reduce(function (s, ci, i) { return s + ci * Math.pow(x, i); }, 0); }
  function dpoly(c, x) { return c.reduce(function (s, ci, i) { return i ? s + i * ci * Math.pow(x, i - 1) : s; }, 0); }
  function polyStr(c) {
    var t = [];
    c.forEach(function (ci, i) {
      if (!ci) return;
      var k = (ci === 1 && i) ? '' : (ci === -1 && i) ? '−' : String(ci);
      t.push(k + (i === 0 ? '' : i === 1 ? 'x' : 'x^' + i));
    });
    return t.length ? t.join(' + ').replace(/\+ -/g, '− ').replace(/\+ −/g, '− ') : '0';
  }
  // a "function plot" made of bars: f sampled at xs, with the current point highlighted
  function curve(label, xs, f, cur, cls) {
    var hl = {};
    var vals = xs.map(function (x, i) { if (cur !== undefined && Math.abs(x - cur) < 1e-9) hl[i] = cls || 'cur'; return r3(f(x)); });
    return { type: 'bars', label: label, values: vals, hl: hl, idxLabels: xs.map(function (x) { return String(r3(x)); }) };
  }

  /* builds a problem; `key` pulls the Python model solution, brute code and tests from SOL/TESTS (generated chunk) */
  function PR(key, o) {
    var s = SOL[key], t = TESTS[key];
    var brute = { why: o.bruteWhy };
    if (s && s.brute) brute.code = { lang: 'python', code: s.brute };
    var sol = { approach: o.approach, complexity: o.complexity, followUps: o.followUps || [] };
    if (s) sol.code = { lang: 'python', code: s.code };
    if (o.dry) sol.dry = o.dry;
    var p = {
      title: o.title, level: o.level, tags: o.tags, companies: o.companies || [], lang: 'python',
      statement: o.statement, constraints: o.constraints, example: o.example,
      brute: brute, mcq: o.mcq, hints: o.hints, solution: sol
    };
    p.tests = t ? { sig: t.sig, fn: t.fn, cmp: t.cmp, cases: t.cases } : { skip: 'conceptual' };
    return p;
  }
  // ---- generated: Python model solutions and test cases (from a stdlib-only generator) ----
  var SOL = {
"deriv": {
"code": "def derivative_at(coeffs, x):\n    # coeffs[i] is the number in front of x**i, so f(x) = c0 + c1*x + c2*x^2 + ...\n    # Power rule: the derivative of c * x**i is i * c * x**(i - 1).\n    total = 0.0\n    for i, c in enumerate(coeffs):\n        if i == 0:\n            continue                  # a constant does not change, slope 0\n        total += i * c * x ** (i - 1)\n    return total\n",
"brute": "def derivative_at(coeffs, x):\n    # Numeric slope with a tiny forward step: close, but not exact (error about h)\n    h = 1e-6\n    f = lambda t: sum(c * t ** i for i, c in enumerate(coeffs))\n    return (f(x + h) - f(x)) / h\n"
},
"chain": {
"code": "import math\n\ndef chain_rule_grad(w, b, x, y):\n    # Forward pass, saving every middle value\n    z = w * x + b                    # step 1: weighted input\n    a = 1 / (1 + math.exp(-z))       # step 2: sigmoid squashes z into (0, 1)\n    # L = (a - y)^2                  # step 3: squared error\n    # Backward pass: multiply the local slopes from the loss back to each input\n    dL_da = 2 * (a - y)              # slope of (a - y)^2 with respect to a\n    da_dz = a * (1 - a)              # slope of the sigmoid\n    dL_dz = dL_da * da_dz            # chain rule: link the two\n    dL_dw = dL_dz * x                # dz/dw = x\n    dL_db = dL_dz * 1                # dz/db = 1\n    return [dL_dw, dL_db]\n",
"brute": null
},
"grad2": {
"code": "def quadratic_gradient(coeffs, x, y):\n    # f(x, y) = a*x^2 + b*x*y + c*y^2 + d*x + e*y\n    a, b, c, d, e = coeffs\n    # partial wrt x: treat y as a fixed number, differentiate in x\n    df_dx = 2 * a * x + b * y + d\n    # partial wrt y: treat x as a fixed number, differentiate in y\n    df_dy = b * x + 2 * c * y + e\n    return [df_dx, df_dy]\n",
"brute": "def quadratic_gradient(coeffs, x, y):\n    # Numeric partials: nudge one variable at a time (central difference)\n    a, b, c, d, e = coeffs\n    f = lambda u, v: a * u * u + b * u * v + c * v * v + d * u + e * v\n    h = 1e-5\n    return [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)]\n"
},
"gd": {
"code": "def gradient_descent(a, c, x0, lr, n):\n    # Minimise f(x) = a * (x - c)^2. Its slope is f'(x) = 2 * a * (x - c).\n    x = x0\n    for _ in range(n):\n        grad = 2 * a * (x - c)   # which way is uphill, and how steep\n        x = x - lr * grad        # step downhill, scaled by the learning rate\n    return x\n",
"brute": null
},
"mseg": {
"code": "def mse_and_grad(xs, ys, w, b):\n    n = len(xs)\n    loss = dw = db = 0.0\n    for x, y in zip(xs, ys):\n        err = (w * x + b) - y      # prediction minus truth\n        loss += err * err\n        dw += 2 * err * x          # d(err^2)/dw = 2 * err * x\n        db += 2 * err              # d(err^2)/db = 2 * err\n    return [loss / n, dw / n, db / n]   # MSE averages over the n points\n",
"brute": null
},
"backprop": {
"code": "import math\n\ndef backprop_tiny(x, y, W1, b1, w2, b2):\n    sig = lambda t: 1 / (1 + math.exp(-t))\n    H, D = len(W1), len(x)\n    # ---- forward pass (keep every middle value: backward needs them) ----\n    z1 = [sum(W1[j][i] * x[i] for i in range(D)) + b1[j] for j in range(H)]\n    h = [sig(z) for z in z1]                       # hidden activations\n    y_hat = sum(w2[j] * h[j] for j in range(H)) + b2   # linear output\n    loss = 0.5 * (y_hat - y) ** 2\n    # ---- backward pass: from the loss back towards the input ----\n    d_yhat = y_hat - y                             # dL/dy_hat for 0.5 * err^2\n    d_w2 = [d_yhat * h[j] for j in range(H)]       # y_hat = sum w2_j h_j + b2\n    d_b2 = d_yhat\n    d_h = [d_yhat * w2[j] for j in range(H)]       # flows back through w2\n    d_z1 = [d_h[j] * h[j] * (1 - h[j]) for j in range(H)]   # sigmoid slope\n    d_W1 = [[d_z1[j] * x[i] for i in range(D)] for j in range(H)]\n    d_b1 = d_z1[:]\n    # flat answer: loss, dW1 row by row, db1, dw2, db2\n    out = [loss]\n    for row in d_W1:\n        out += row\n    return out + d_b1 + d_w2 + [d_b2]\n",
"brute": null
},
"adam": {
"code": "import math\n\ndef adam_step(w, g, m, v, t, lr, beta1, beta2, eps):\n    # 1) momentum: running average of gradients (direction memory)\n    m = beta1 * m + (1 - beta1) * g\n    # 2) running average of squared gradients (how big steps usually are)\n    v = beta2 * v + (1 - beta2) * g * g\n    # 3) bias correction: m and v start at 0, so early averages are too small\n    m_hat = m / (1 - beta1 ** t)\n    v_hat = v / (1 - beta2 ** t)\n    # 4) step: momentum divided by typical size -> about lr per step\n    w = w - lr * m_hat / (math.sqrt(v_hat) + eps)\n    return [w, m, v]\n",
"brute": null
},
"ridge": {
"code": "def ridge_gd(xs, ys, lam, lr, steps):\n    # Loss = mean((w*x - y)^2) + lam * w^2   (one weight, no bias)\n    n = len(xs)\n    w = 0.0\n    for _ in range(steps):\n        data_grad = sum(2 * (w * x - y) * x for x, y in zip(xs, ys)) / n\n        reg_grad = 2 * lam * w           # the penalty always pulls w towards 0\n        w -= lr * (data_grad + reg_grad)\n    return w\n",
"brute": null
},
"numder": {
"code": "def numeric_derivative(coeffs, x, h):\n    # f(x) = c0 + c1*x + c2*x^2 + ...\n    def f(t):\n        return sum(c * t ** i for i, c in enumerate(coeffs))\n    # central difference: slope of the line through (x-h, f) and (x+h, f)\n    return (f(x + h) - f(x - h)) / (2 * h)\n",
"brute": "def numeric_derivative(coeffs, x, h):\n    # forward difference: one-sided, error shrinks only like h (not h^2)\n    f = lambda t: sum(c * t ** i for i, c in enumerate(coeffs))\n    return (f(x + h) - f(x)) / h\n"
},
"sigd": {
"code": "import math\n\ndef sigmoid_derivative(z):\n    # numerically safe sigmoid: never call exp on a large positive number\n    if z >= 0:\n        s = 1 / (1 + math.exp(-z))\n    else:\n        e = math.exp(z)\n        s = e / (1 + e)\n    return s * (1 - s)          # the famous shortcut: sigma' = sigma * (1 - sigma)\n",
"brute": "import math\n\ndef sigmoid_derivative(z):\n    # direct quotient-rule formula: e^-z / (1 + e^-z)^2. Overflows for z << 0 (math.exp(800))\n    e = math.exp(-z)\n    return e / (1 + e) ** 2\n"
},
"mse": {
"code": "def mse(y_true, y_pred):\n    # mean of the squared differences\n    n = len(y_true)\n    return sum((p - t) ** 2 for t, p in zip(y_true, y_pred)) / n\n",
"brute": null
},
"bce": {
"code": "import math\n\ndef binary_cross_entropy(y_true, p):\n    eps = 1e-12\n    total = 0.0\n    for y, q in zip(y_true, p):\n        q = min(max(q, eps), 1 - eps)          # clip: log(0) would be -infinity\n        total += -(y * math.log(q) + (1 - y) * math.log(1 - q))\n    return total / len(y_true)                  # average over the examples\n",
"brute": null
},
"early": {
"code": "def early_stopping_epoch(val_losses, patience):\n    best_epoch, best = 0, val_losses[0]\n    waited = 0\n    for epoch in range(1, len(val_losses)):\n        if val_losses[epoch] < best:        # a new best: remember it, reset the clock\n            best, best_epoch, waited = val_losses[epoch], epoch, 0\n        else:\n            waited += 1\n            if waited >= patience:          # no progress for `patience` epochs: stop\n                break\n    return best_epoch                        # restore the weights from this epoch\n",
"brute": null
},
"smce": {
"code": "import math\n\ndef softmax_ce_grad(logits, target):\n    # softmax, shifted by the max so exp never overflows\n    m = max(logits)\n    ex = [math.exp(z - m) for z in logits]\n    s = sum(ex)\n    probs = [e / s for e in ex]\n    # gradient of -log(probs[target]) with respect to each logit: p - one_hot\n    return [p - (1.0 if i == target else 0.0) for i, p in enumerate(probs)]\n",
"brute": "import math\n\ndef softmax_ce_grad(logits, target):\n    # Numeric gradient of the loss, one logit at a time: 2n loss evaluations, approximate\n    def loss(z):\n        m = max(z)\n        s = sum(math.exp(t - m) for t in z)\n        return -(z[target] - m - math.log(s))\n    h = 1e-6\n    out = []\n    for i in range(len(logits)):\n        up = logits[:]; up[i] += h\n        dn = logits[:]; dn[i] -= h\n        out.append((loss(up) - loss(dn)) / (2 * h))\n    return out\n"
},
"mom": {
"code": "def momentum_descent(a, x0, lr, beta, n):\n    # Minimise f(x) = 0.5 * a * x^2, so the gradient is a * x.\n    x, v = x0, 0.0\n    for _ in range(n):\n        g = a * x\n        v = beta * v + g      # velocity: a running sum of past gradients\n        x = x - lr * v        # move with the velocity, not just today's slope\n    return x\n",
"brute": null
},
"steps": {
"code": "def steps_to_converge(a, lr, x0, tol, max_steps):\n    # f(x) = a * x^2, gradient 2*a*x, so every step multiplies x by (1 - 2*a*lr)\n    x = x0\n    for step in range(max_steps + 1):\n        if abs(x) < tol:\n            return step              # number of updates needed\n        if abs(x) > 1e12:\n            return -1                # clearly blowing up: diverged\n        x = x - lr * 2 * a * x\n    return -1                        # never got close enough in time\n",
"brute": null
},
"linreg": {
"code": "def linear_regression_gd(xs, ys, lr, steps):\n    # Fit y ~ w*x + b by full-batch gradient descent on the mean squared error.\n    n = len(xs)\n    w = b = 0.0\n    for _ in range(steps):\n        dw = db = 0.0\n        for x, y in zip(xs, ys):\n            err = (w * x + b) - y\n            dw += 2 * err * x / n\n            db += 2 * err / n\n        w -= lr * dw          # update both together, using the same old values\n        b -= lr * db\n    return [w, b]\n",
"brute": null
},
"rosen": {
"code": "def rosenbrock_gradient(x, y):\n    # f(x, y) = (1 - x)^2 + 100 * (y - x^2)^2   (a curved valley, minimum at (1, 1))\n    inner = y - x * x\n    df_dx = -2 * (1 - x) + 100 * 2 * inner * (-2 * x)   # chain rule through x^2\n    df_dy = 100 * 2 * inner\n    return [df_dx, df_dy]\n",
"brute": null
},
"sched": {
"code": "import math\n\ndef warmup_cosine_lr(step, total_steps, warmup_steps, base_lr, min_lr):\n    # Phase 1: linear warm-up from small to base_lr (step counts from 0)\n    if step < warmup_steps:\n        return base_lr * (step + 1) / warmup_steps\n    # Phase 2: cosine decay from base_lr down to min_lr\n    progress = (step - warmup_steps) / max(1, total_steps - warmup_steps)\n    progress = min(progress, 1.0)\n    return min_lr + 0.5 * (base_lr - min_lr) * (1 + math.cos(math.pi * progress))\n",
"brute": null
},
"logreg": {
"code": "import math\n\ndef logistic_regression_gd(X, y, lr, steps):\n    n, d = len(X), len(X[0])\n    w = [0.0] * d\n    b = 0.0\n    sig = lambda z: 1 / (1 + math.exp(-z)) if z >= 0 else math.exp(z) / (1 + math.exp(z))\n    for _ in range(steps):\n        gw = [0.0] * d\n        gb = 0.0\n        for row, target in zip(X, y):\n            p = sig(sum(wi * xi for wi, xi in zip(w, row)) + b)\n            err = p - target                 # BCE + sigmoid: gradient wrt z is just p - y\n            for j in range(d):\n                gw[j] += err * row[j] / n\n            gb += err / n\n        w = [wi - lr * gi for wi, gi in zip(w, gw)]\n        b -= lr * gb\n    return w + [b]\n",
"brute": null
},
"gcheck": {
"code": "import math\n\ndef numeric_gradient_check(x, y, W1, b1, w2, b2):\n    # Same tiny network as the backprop lesson: sigmoid hidden layer, linear output,\n    # L = 0.5 * (y_hat - y)^2. We never use calculus here: only nudges.\n    H, D = len(W1), len(x)\n\n    # 1) flatten every parameter into ONE list (same order as backprop_tiny's answer)\n    theta = [w for row in W1 for w in row] + list(b1) + list(w2) + [b2]\n\n    def loss(t):\n        # unflatten t back into W1, b1, w2, b2, then run the forward pass\n        W = [t[j * D:(j + 1) * D] for j in range(H)]\n        bb = t[H * D:H * D + H]\n        v = t[H * D + H:H * D + 2 * H]\n        c = t[-1]\n        h = [1 / (1 + math.exp(-(sum(W[j][i] * x[i] for i in range(D)) + bb[j]))) for j in range(H)]\n        y_hat = sum(v[j] * h[j] for j in range(H)) + c\n        return 0.5 * (y_hat - y) ** 2\n\n    # 2) central difference for each parameter: (L(theta + eps) - L(theta - eps)) / (2 * eps)\n    eps = 1e-5\n    grads = []\n    for k in range(len(theta)):\n        up = theta[:]; up[k] += eps\n        dn = theta[:]; dn[k] -= eps\n        grads.append((loss(up) - loss(dn)) / (2 * eps))\n    return grads\n",
"brute": null
},
"adamopt": {
"code": "import math\n\ndef adam_optimize(c, x0, lr, steps):\n    # Minimise f(x) = (x - c)^2 with Adam (beta1 = 0.9, beta2 = 0.999, eps = 1e-8)\n    b1, b2, eps = 0.9, 0.999, 1e-8\n    x, m, v = x0, 0.0, 0.0\n    for t in range(1, steps + 1):\n        g = 2 * (x - c)\n        m = b1 * m + (1 - b1) * g\n        v = b2 * v + (1 - b2) * g * g\n        m_hat = m / (1 - b1 ** t)\n        v_hat = v / (1 - b2 ** t)\n        x -= lr * m_hat / (math.sqrt(v_hat) + eps)\n    return x\n",
"brute": null
},
"train": {
"code": "import math\n\ndef train_tiny_net(X, Y, W1, b1, w2, b2, lr, epochs):\n    sig = lambda t: 1 / (1 + math.exp(-t))\n    W1 = [r[:] for r in W1]; b1 = b1[:]; w2 = w2[:]   # do not change the caller's lists\n    H, D, n = len(W1), len(X[0]), len(X)\n\n    def forward(x):\n        h = [sig(sum(W1[j][i] * x[i] for i in range(D)) + b1[j]) for j in range(H)]\n        return h, sum(w2[j] * h[j] for j in range(H)) + b2\n\n    def mean_loss():\n        return sum(0.5 * (forward(x)[1] - y) ** 2 for x, y in zip(X, Y)) / n\n\n    first = mean_loss()\n    for _ in range(epochs):\n        gW = [[0.0] * D for _ in range(H)]; gb1 = [0.0] * H; gw2 = [0.0] * H; gb2 = 0.0\n        for x, y in zip(X, Y):                      # add up gradients over the batch\n            h, y_hat = forward(x)\n            d = (y_hat - y) / n                     # averaged loss -> divide by n\n            gb2 += d\n            for j in range(H):\n                gw2[j] += d * h[j]\n                dz = d * w2[j] * h[j] * (1 - h[j])\n                gb1[j] += dz\n                for i in range(D):\n                    gW[j][i] += dz * x[i]\n        for j in range(H):                          # one update per epoch (full batch)\n            w2[j] -= lr * gw2[j]; b1[j] -= lr * gb1[j]\n            for i in range(D):\n                W1[j][i] -= lr * gW[j][i]\n        b2 -= lr * gb2\n    return [first, mean_loss()]\n",
"brute": null
},
"adamw": {
"code": "import math\n\ndef adam_l2_vs_adamw(a, w0, lr, wd, steps):\n    # Data loss 0.5 * a * w^2 -> gradient a * w. Both runs use beta1=0.9, beta2=0.999, eps=1e-8.\n    b1, b2, eps = 0.9, 0.999, 1e-8\n\n    def run(decoupled):\n        w, m, v = w0, 0.0, 0.0\n        for t in range(1, steps + 1):\n            g = a * w\n            if not decoupled:\n                g += wd * w                       # Adam + L2: the penalty joins the gradient\n            m = b1 * m + (1 - b1) * g\n            v = b2 * v + (1 - b2) * g * g\n            step = (m / (1 - b1 ** t)) / (math.sqrt(v / (1 - b2 ** t)) + eps)\n            if decoupled:\n                w -= lr * wd * w                  # AdamW: shrink the weight directly\n            w -= lr * step\n        return w\n\n    return [run(False), run(True)]\n",
"brute": null
}
};
  var TESTS = {"deriv": {"sig": "double[] double -> double", "fn": "derivative_at", "cmp": "float", "cases": [[[[0, 0, 1], 3], 6.0], [[[5, -2, 0, 1], 2], 10.0], [[[7], 4], 0.0], [[[1, 1, 1, 1, 1], -1], -2.0], [[[0, 0, 0, 2], 0.5], 1.5], [[[9, 4], 100], 4.0], [[[0, -6, 1], 3], 0.0]]}, "chain": {"sig": "double double double double -> double[]", "fn": "chain_rule_grad", "cmp": "float", "cases": [[[0, 0, 1, 1], [-0.25, -0.25]], [[0.5, 0.1, 2, 1], [-0.1871749357, -0.0935874679]], [[1, -1, 1, 0], [0.25, 0.25]], [[-2, 0.5, 0.5, 1], [-0.1462802535, -0.2925605071]], [[0.3, 0.2, 0, 0], [0.0, 0.2721860532]], [[2, 1, 3, 1], [-4.9755e-06, -1.6585e-06]], [[0.1, -0.4, -2, 0], [-0.3242730114, 0.1621365057]]]}, "grad2": {"sig": "double[] double double -> double[]", "fn": "quadratic_gradient", "cmp": "float", "cases": [[[[1, 0, 3, 0, 0], 1, 1], [2, 6]], [[[1, 0, 1, 0, 0], 0, 0], [0, 0]], [[[0, 1, 0, 0, 0], 2, 5], [5, 2]], [[[1, 2, 1, -4, 0], 1, -1], [-4, 0]], [[[2, -1, 0.5, 3, -2], -2, 4], [-9, 4.0]], [[[0, 0, 0, 7, -3], 10, 10], [7, -3]], [[[1, 0, 1, -2, -4], 1, 2], [0, 0]]]}, "gd": {"sig": "double double double double int -> double", "fn": "gradient_descent", "cmp": "float", "cases": [[[1, 3, 0, 0.1, 1], 0.6], [[1, 3, 0, 0.1, 10], 2.6778774528], [[1, 3, 0, 0.5, 1], 3.0], [[1, 3, 0, 0.01, 5], 0.2882376096], [[1, 3, 0, 1.1, 5], 10.46496], [[2, -1, 4, 0.1, 20], -0.9998171921], [[1, 3, 0, 1.0, 4], 0.0], [[5, 0, 1, 0.1, 0], 1]]}, "mseg": {"sig": "double[] double[] double double -> double[]", "fn": "mse_and_grad", "cmp": "float", "cases": [[[[1, 2, 3], [2, 4, 6], 2, 0], [0.0, 0.0, 0.0]], [[[1, 2, 3], [2, 4, 6], 0, 0], [18.6666666667, -18.6666666667, -8.0]], [[[1, 2, 3], [2, 4, 6], 1, 1], [1.6666666667, -5.3333333333, -2.0]], [[[0], [5], 0, 0], [25.0, 0.0, -10.0]], [[[-1, 0, 1], [1, 0, 1], 0, 0.5], [0.25, 0.0, -0.3333333333]], [[[2, 4], [1, 3], 0.5, 0.5], [0.25, -1.0, 0.0]], [[[1, 1, 1, 1], [0, 1, 0, 1], 0, 0], [0.5, -1.0, -1.0]]]}, "backprop": {"sig": "double[] double double[][] double[] double[] double -> double[]", "fn": "backprop_tiny", "cmp": "float", "cases": [[[[1, 2], 1, [[0.1, 0.2], [-0.3, 0.4]], [0, 0], [0.5, -0.5], 0], [0.5, -0.1175018561, -0.2350037122, 0.1175018561, 0.2350037122, -0.1175018561, 0.1175018561, -0.6224593312, -0.6224593312, -1.0]], [[[0, 0], 0, [[1, 1], [1, 1]], [0, 0], [1, 1], 0], [0.5, 0.0, 0.0, 0.0, 0.0, 0.25, 0.25, 0.5, 0.5, 1.0]], [[[1], 0, [[0.5], [-0.5]], [0.1, 0.1], [1, 2], 0.5], [1.8978994002, 0.4457359856, 0.9361908852, 0.4457359856, 0.9361908852, 1.2579199049, 0.7818692013, 1.948280986]], [[[2, -1], 3, [[0.2, -0.1], [0.4, 0.3]], [0.1, -0.2], [1.5, -0.7], 0.2], [2.4945409958, -1.5330548048, 0.7665274024, 0.7644395785, -0.3822197893, -0.7665274024, 0.3822197893, -1.4421542623, -1.2830893403, -2.2336253024]], [[[1, 1, 1], 1, [[0.1, 0.1, 0.1]], [0], [2], 0], [0.0110833766, 0.0727923679, 0.0727923679, 0.0727923679, 0.0727923679, 0.0855258934, 0.1488850336]], [[[0.5, -0.5], -1, [[1, -1], [0, 2], [-1, 0.5]], [0, 0.5, -0.5], [0.3, -0.2, 0.1], 0], [0.6798706462, 0.0343897704, -0.0343897704, -0.0274033, 0.0274033, 0.0100926968, -0.0100926968, 0.0687795407, -0.0548066001, 0.0201853935, 0.852472388, 0.4402424168, 0.2596860562, 1.1660794537]]]}, "adam": {"sig": "double double double double int double double double double -> double[]", "fn": "adam_step", "cmp": "float", "cases": [[[1.0, 0.5, 0, 0, 1, 0.1, 0.9, 0.999, 1e-08], [0.900000002, 0.05, 0.00025]], [[1.0, -2.0, 0, 0, 1, 0.01, 0.9, 0.999, 1e-08], [1.01, -0.2, 0.004]], [[0.0, 0.0, 0, 0, 1, 0.1, 0.9, 0.999, 1e-08], [0.0, 0.0, 0.0]], [[2.0, 0.3, 0.1, 0.01, 2, 0.05, 0.9, 0.999, 1e-08], [1.9859371359, 0.12, 0.01008]], [[-1.0, 4.0, 0.5, 2.0, 10, 0.001, 0.9, 0.999, 1e-08], [-1.0000917523, 0.85, 2.014]], [[0.5, 0.0001, 0, 0, 1, 0.1, 0.9, 0.999, 1e-08], [0.400009999, 1e-05, 1e-11]], [[3.0, 1.0, 0.2, 0.5, 3, 0.1, 0.8, 0.99, 1e-06], [2.9821095024, 0.36, 0.505]]]}, "ridge": {"sig": "double[] double[] double double int -> double", "fn": "ridge_gd", "cmp": "float", "cases": [[[[1, 2, 3], [2, 4, 6], 0, 0.05, 200], 2.0], [[[1, 2, 3], [2, 4, 6], 1, 0.05, 200], 1.6470588235], [[[1, 2, 3], [2, 4, 6], 10, 0.02, 300], 0.6363636364], [[[1, -1], [1, -1], 0.5, 0.1, 100], 0.6666666667], [[[2], [3], 0, 0.1, 0], 0.0], [[[1, 2, 3, 4], [1.1, 1.9, 3.2, 3.9], 0.1, 0.02, 500], 0.9901315789], [[[1, 2, 3], [2, 4, 6], 1, 0.05, 1], 0.9333333333]]}, "numder": {"sig": "double[] double double -> double", "fn": "numeric_derivative", "cmp": "float", "cases": [[[[0, 0, 1], 3, 0.001], 6.0], [[[0, 0, 0, 1], 2, 0.1], 12.01], [[[0, 0, 0, 1], 2, 0.001], 12.000001], [[[4, 3], 7, 0.5], 3.0], [[[1, -2, 0.5], -1, 0.01], -3.0], [[[0, 0, 0, 0, 1], 1, 0.01], 4.0004], [[[2], 5, 0.1], 0.0]]}, "sigd": {"sig": "double -> double", "fn": "sigmoid_derivative", "cmp": "float", "cases": [[[0], 0.25], [[2], 0.1049935854], [[-2], 0.1049935854], [[10], 4.53958e-05], [[-800], 0.0], [[0.5], 0.2350037122], [[800], 0.0]]}, "mse": {"sig": "double[] double[] -> double", "fn": "mse", "cmp": "float", "cases": [[[[1, 2, 3], [1, 2, 3]], 0.0], [[[1, 2, 3], [2, 2, 5]], 1.6666666667], [[[0], [4]], 16.0], [[[3, -1], [-1, 3]], 16.0], [[[0.5, 0.5, 0.5, 0.5], [0, 1, 0, 1]], 0.25], [[[10, 20], [11, 18]], 2.5]]}, "bce": {"sig": "double[] double[] -> double", "fn": "binary_cross_entropy", "cmp": "float", "cases": [[[[1], [0.9]], 0.1053605157], [[[0], [0.9]], 2.302585093], [[[1, 0], [0.5, 0.5]], 0.6931471806], [[[1, 0, 1], [0.8, 0.2, 0.6]], 0.3190375755], [[[1], [1.0]], 0.0], [[[1], [0.0]], 27.6310211159], [[[0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8]], 0.4722879538]]}, "early": {"sig": "double[] int -> int", "fn": "early_stopping_epoch", "cmp": "exact", "cases": [[[[1.0, 0.8, 0.6, 0.65, 0.7, 0.5], 2], 2], [[[1.0, 0.8, 0.6, 0.65, 0.7, 0.5], 3], 5], [[[0.5], 1], 0], [[[0.9, 0.8, 0.7, 0.6], 1], 3], [[[0.4, 0.5, 0.6, 0.3], 2], 0], [[[0.4, 0.4, 0.4], 5], 0], [[[2.0, 1.5, 1.6, 1.4, 1.45, 1.5, 1.2], 2], 3]]}, "smce": {"sig": "double[] int -> double[]", "fn": "softmax_ce_grad", "cmp": "float", "cases": [[[[0, 0], 0], [-0.5, 0.5]], [[[2, 1, 0.1], 0], [-0.3409988611, 0.2424329707, 0.0985658904]], [[[2, 1, 0.1], 2], [0.6590011389, 0.2424329707, -0.9014341096]], [[[1000, 0], 0], [0.0, 0.0]], [[[0, 0, 0, 0], 3], [0.25, 0.25, 0.25, -0.75]], [[[-1, 3, 0.5], 1], [0.0166445186, -0.0912400757, 0.0745955571]], [[[5], 0], [0.0]]]}, "mom": {"sig": "double double double double int -> double", "fn": "momentum_descent", "cmp": "float", "cases": [[[1, 10, 0.1, 0.0, 10], 3.486784401], [[1, 10, 0.1, 0.9, 10], -5.887893888], [[1, 10, 0.01, 0.9, 50], -0.584530272], [[1, 10, 0.01, 0.0, 50], 6.0500606714], [[10, 1, 0.05, 0.5, 20], -0.0009765625], [[2, -3, 0.1, 0.9, 1], -2.4], [[1, 5, 0.1, 0.9, 0], 5]]}, "steps": {"sig": "double double double double int -> int", "fn": "steps_to_converge", "cmp": "exact", "cases": [[[1, 0.1, 1, 0.001, 1000], 31], [[1, 0.5, 1, 0.001, 1000], 1], [[1, 0.01, 1, 0.001, 1000], 342], [[1, 1.0, 1, 0.001, 1000], -1], [[1, 1.2, 1, 0.001, 1000], -1], [[1, 0.9, 1, 0.001, 1000], 31], [[5, 0.1, 0.0005, 0.001, 10], 0], [[1, 0.001, 1, 0.001, 100], -1]]}, "linreg": {"sig": "double[] double[] double int -> double[]", "fn": "linear_regression_gd", "cmp": "float", "cases": [[[[1, 2, 3, 4], [3, 5, 7, 9], 0.05, 2000], [2.0, 1.0]], [[[0, 1, 2], [1, 1, 1], 0.1, 500], [0.0, 1.0]], [[[1, 2, 3, 4], [3, 5, 7, 9], 0.05, 1], [1.75, 0.6]], [[[-1, 0, 1], [-2, 0, 2], 0.1, 300], [2.0, 0.0]], [[[1, 2, 3], [2, 2.5, 4.5], 0.05, 3000], [1.25, 0.5]], [[[1, 2], [1, 2], 0.1, 0], [0.0, 0.0]]]}, "rosen": {"sig": "double double -> double[]", "fn": "rosenbrock_gradient", "cmp": "float", "cases": [[[1, 1], [0, 0]], [[0, 0], [-2, 0]], [[-1, 1], [-4, 0]], [[2, 1], [2402, -600]], [[0.5, 0.25], [-1.0, 0.0]], [[-1.5, 2], [-155.0, -50.0]], [[1, 0], [400, -200]]]}, "sched": {"sig": "int int int double double -> double", "fn": "warmup_cosine_lr", "cmp": "float", "cases": [[[0, 100, 10, 0.001, 0], 0.0001], [[9, 100, 10, 0.001, 0], 0.001], [[10, 100, 10, 0.001, 0], 0.001], [[55, 100, 10, 0.001, 0], 0.0005], [[100, 100, 10, 0.001, 0.0001], 0.0001], [[150, 100, 10, 0.001, 0.0001], 0.0001], [[25, 100, 0, 0.1, 0.0], 0.0853553391]]}, "logreg": {"sig": "double[][] double[] double int -> double[]", "fn": "logistic_regression_gd", "cmp": "float", "cases": [[[[[0], [1], [2], [3]], [0, 0, 1, 1], 0.5, 1], [0.25, 0.0]], [[[[0], [1], [2], [3]], [0, 0, 1, 1], 0.5, 200], [3.3808677416, -4.7688833061]], [[[[1, 0], [0, 1], [1, 1], [0, 0]], [1, 0, 1, 0], 1.0, 100], [5.8986915328, -0.4233251892, -2.5225579745]], [[[[1, 2], [2, 1], [-1, -2], [-2, -1]], [1, 1, 0, 0], 0.1, 50], [1.0149103865, 1.0149103865, -0.0]], [[[[0.5], [1.5]], [1, 0], 0.3, 30], [-1.1554431486, 0.7439938907]], [[[[1], [2]], [1, 1], 0.1, 0], [0.0, 0.0]]]}, "gcheck": {"sig": "double[] double double[][] double[] double[] double -> double[]", "fn": "numeric_gradient_check", "cmp": "float", "cases": [[[[1, 2], 1, [[0.1, 0.2], [-0.3, 0.4]], [0, 0], [0.5, -0.5], 0], [-0.1175018561, -0.2350037122, 0.1175018561, 0.2350037122, -0.1175018561, 0.1175018561, -0.6224593312, -0.6224593312, -1.0]], [[[0, 0], 0, [[1, 1], [1, 1]], [0, 0], [1, 1], 0], [0.0, 0.0, 0.0, 0.0, 0.25, 0.25, 0.5, 0.5, 1.0]], [[[1], 0, [[0.5], [-0.5]], [0.1, 0.1], [1, 2], 0.5], [0.4457359856, 0.9361908852, 0.4457359856, 0.9361908852, 1.2579199049, 0.7818692013, 1.948280986]], [[[2, -1], 3, [[0.2, -0.1], [0.4, 0.3]], [0.1, -0.2], [1.5, -0.7], 0.2], [-1.5330548048, 0.7665274024, 0.7644395785, -0.3822197893, -0.7665274024, 0.3822197893, -1.4421542623, -1.2830893403, -2.2336253024]], [[[1, 1, 1], 1, [[0.1, 0.1, 0.1]], [0], [2], 0], [0.0727923679, 0.0727923679, 0.0727923679, 0.0727923679, 0.0855258934, 0.1488850336]], [[[0.5, -0.5], -1, [[1, -1], [0, 2], [-1, 0.5]], [0, 0.5, -0.5], [0.3, -0.2, 0.1], 0], [0.0343897704, -0.0343897704, -0.0274033, 0.0274033, 0.0100926968, -0.0100926968, 0.0687795407, -0.0548066001, 0.0201853935, 0.852472388, 0.4402424168, 0.2596860562, 1.1660794537]]]}, "adamopt": {"sig": "double double double int -> double", "fn": "adam_optimize", "cmp": "float", "cases": [[[3, 0, 0.1, 1], 0.0999999998], [[3, 0, 0.1, 5], 0.4982205438], [[3, 0, 0.1, 500], 3.0], [[3, 0, 0.5, 300], 3.0000004166], [[-2, 10, 1.0, 200], -1.9997344295], [[0, 0, 0.1, 10], 0.0], [[1000, 0, 0.1, 10], 0.9999677643]]}, "train": {"sig": "double[][] double[] double[][] double[] double[] double double int -> double[]", "fn": "train_tiny_net", "cmp": "float", "cases": [[[[[0], [1]], [0, 1], [[1], [-1]], [0, 0], [0.5, 0.5], 0, 0.5, 1], [0.125, 0.1210719876]], [[[[0], [1]], [0, 1], [[1], [-1]], [0, 0], [0.5, 0.5], 0, 0.5, 200], [0.125, 1.96e-08]], [[[[0, 0], [0, 1], [1, 0], [1, 1]], [0, 1, 1, 0], [[0.5, -0.4], [-0.3, 0.6]], [0.1, -0.1], [0.4, -0.3], 0.0, 1.0, 50], [0.2230187474, 0.1254057696]], [[[[1, 2], [2, 1], [3, 3]], [1, 2, 3], [[0.1, 0.1], [0.2, -0.1]], [0, 0], [0.3, 0.3], 0.1, 0.1, 100], [1.528961762, 0.183490433]], [[[[1]], [2], [[0.2]], [0], [1], 0, 0.1, 0], [1.0514907177, 1.0514907177]], [[[[0.5], [-0.5]], [1, -1], [[2], [-2]], [0, 0], [0.1, -0.1], 0, 0.3, 300], [0.4548560456, 0.0]]]}, "adamw": {"sig": "double double double double int -> double[]", "fn": "adam_l2_vs_adamw", "cmp": "float", "cases": [[[1, 1, 0.1, 0.1, 1], [0.9000000009, 0.890000001]], [[1, 1, 0.01, 0.1, 50], [0.5368211753, 0.5033860159]], [[0, 1, 0.01, 0.5, 20], [0.8026664454, 0.9046104803]], [[0, 1, 0.01, 0.0, 20], [1.0, 1.0]], [[2, -3, 0.05, 0.01, 30], [-1.5803712298, -1.5488259344]], [[1, 1, 0.1, 0.1, 0], [1, 1]]]}};


  // ===================== TOPIC 1: DERIVATIVES =====================
  topics.push({
    title: 'Derivatives: Slope, Rules and the Numeric Check',
    analogy: `<p>You are driving and glance at the speedometer: <b>60 km/h</b>. That number is not "distance travelled". It is <b>how fast the distance is changing right now</b>. A derivative is a speedometer for any formula: it tells you how fast the output changes when you nudge the input a tiny bit. In machine learning the "formula" is the loss (how wrong the model is) and the "input" is a weight. The derivative says: <i>if I turn this knob a hair to the right, does the error go up or down, and how fast?</i></p>`,
    explain: `<p><b>🟢 The plain idea.</b> A <b>derivative</b> is the <b>slope</b> of a curve at one point: "rise over run" for a tiny run. Write it <code>f′(x)</code> or <code>df/dx</code> ("the change in f per change in x").</p>
      <h4>1. Slope between two points (the secant)</h4>
      <p>Take <code>f(x) = x²</code>. From x = 3 to x = 4 the output goes from 9 to 16. Rise 7, run 1, slope 7. From 3 to 3.1: f goes 9 → 9.61, slope 0.61 / 0.1 = 6.1. From 3 to 3.001: slope 6.001. As the run <code>h</code> shrinks, the slope settles on <b>6</b>. That limit is the derivative.</p>
      ${H.table(['step h', 'f(3 + h)', 'rise', 'slope = rise / h'], [['1', '16', '7', '7'], ['0.1', '9.61', '0.61', '6.1'], ['0.01', '9.0601', '0.0601', '6.01'], ['0.001', '9.006001', '0.006001', '<span class="c-g">6.001 → 6</span>']])}
      <p>The formal definition is just this table: <code>f′(x) = limit as h → 0 of (f(x + h) − f(x)) / h</code>.</p>
      <h4>2. The rules (so you never need the limit again)</h4>
      ${H.table(['rule', 'function', 'derivative', 'example'], [
        ['constant', 'c', '0', '7 → 0 (flat line)'],
        ['power', 'xⁿ', 'n·xⁿ⁻¹', 'x³ → 3x²'],
        ['constant multiple', 'c·f(x)', 'c·f′(x)', '5x² → 10x'],
        ['sum', 'f + g', 'f′ + g′', 'x² + 3x → 2x + 3'],
        ['product', 'f·g', 'f′g + fg′', 'x·eˣ → eˣ + x·eˣ'],
        ['exponential', 'eˣ', 'eˣ', 'its own slope!'],
        ['log', 'ln x', '1 / x', 'slope at x = 2 is 0.5']
      ])}
      <p>Example: <code>f(x) = x³ − 2x</code>. Power rule on each piece: <code>f′(x) = 3x² − 2</code>. At x = 2: <code>3·4 − 2 = </code><b class="c-g">10</b>. So near x = 2, nudging x up by 0.01 raises f by about 0.1.</p>
      <h4>3. What the sign and size tell you</h4>
      <ul><li><b class="c-g">f′ &gt; 0</b>: going uphill. Increase x → f grows.</li><li><b class="c-r">f′ &lt; 0</b>: going downhill. Increase x → f shrinks.</li><li><b class="c-b">f′ = 0</b>: flat. A bottom (minimum), a top (maximum) or a flat shelf. Training a model means hunting for the place where the loss's slope is zero.</li><li>Big |f′|: steep. Small |f′|: nearly flat.</li></ul>
      <h4>4. Derivatives you will meet in ML</h4>
      ${H.table(['function', 'formula', 'derivative', 'at 0'], [
        ['sigmoid σ', '1 / (1 + e⁻ˣ)', 'σ(x)·(1 − σ(x))', '0.25'],
        ['tanh', '(eˣ − e⁻ˣ) / (eˣ + e⁻ˣ)', '1 − tanh²(x)', '1'],
        ['ReLU', 'max(0, x)', '1 if x &gt; 0, else 0', 'undefined; frameworks use 0'],
        ['squared error', '(w − 4)²', '2(w − 4)', '−8'],
        ['log loss piece', '−ln p', '−1 / p', 'huge when p is tiny']
      ])}
      <h4>5. The numeric derivative: your safety net</h4>
      <p>You can always <i>estimate</i> a slope by trying it: <code>(f(x + h) − f(x − h)) / (2h)</code> with a small h such as 10<sup>−5</sup>. This <b>central difference</b> is much more accurate than the one-sided version, because its error shrinks like h² instead of h. Comparing this estimate with your hand-derived formula is called a <b>gradient check</b>, and it catches most calculus bugs in ML code.</p>`,
    clues: [
      '"how sensitive is the output to this input", "rate of change" → derivative',
      '"find the minimum / maximum of a smooth function" → set the derivative to 0 (or follow it downhill)',
      '"verify your gradient", "sanity-check backprop" → numeric central difference vs analytic derivative',
      '"slope of the tangent line at x = a" → plug a into f′(x)',
      '"derivative of sigmoid / tanh / ReLU" → σ(1 − σ), 1 − tanh², step function',
      '"why do we use h = 1e-5 and not 1e-12" → truncation error vs floating-point round-off'
    ],
    code: [
      { lang: 'python', title: 'Numeric vs analytic derivative (runnable, plain Python)', run: true, code: `def f(x):
    return x ** 3 - 2 * x            # our function

def f_prime(x):
    return 3 * x ** 2 - 2            # power rule, worked out by hand

x = 2.0
exact = f_prime(x)
print("analytic f'(2) =", exact)     # 10.0

print("   h        forward        central      |error| central")
for h in [1e-1, 1e-2, 1e-3, 1e-5, 1e-8, 1e-12]:
    forward = (f(x + h) - f(x)) / h               # one-sided: error ~ h
    central = (f(x + h) - f(x - h)) / (2 * h)     # two-sided: error ~ h^2
    print(f"{h:8.0e}  {forward:13.8f}  {central:13.8f}  {abs(central - exact):.2e}")

# The error first shrinks (better approximation), then grows again for tiny h:
# f(x + h) and f(x - h) become almost equal, and subtracting them loses digits (round-off).
print("sweet spot for central differences is around h = 1e-5")

# where is the slope zero?  3x^2 - 2 = 0  ->  x = +-sqrt(2/3)
import math
for x0 in [math.sqrt(2 / 3), -math.sqrt(2 / 3)]:
    print(f"f'({x0:.4f}) = {f_prime(x0):.1e}  (a flat point)")
` },
      { lang: 'python', title: 'The same derivative with PyTorch autograd (shown, not run here)', code: `import torch

x = torch.tensor(2.0, requires_grad=True)   # ask PyTorch to track operations on x
y = x ** 3 - 2 * x                          # build the computation
y.backward()                                # compute dy/dx automatically
print(x.grad)                               # tensor(10.)

# a numeric check against autograd, like torch.autograd.gradcheck does (needs float64)
from torch.autograd import gradcheck
xx = torch.tensor([2.0], dtype=torch.float64, requires_grad=True)
print(gradcheck(lambda t: t ** 3 - 2 * t, (xx,)))   # True
` }
    ],
    codeTitle: ['Pure Python', 'PyTorch autograd'],
    viz: {
      title: 'Secant slopes shrinking into the derivative',
      input: '0 -2 0 1 | 2',
      inputLabel: 'polynomial coefficients c0 c1 c2 ... | point x   (0 -2 0 1 means x³ − 2x)',
      gen: function (input) {
        var p = splitBar(input, 2, '0 -2 0 1 | 2');
        var c = nums(p[0], 'the coefficients', 6), x = Number(p[1]);
        if (!isFinite(x) || Math.abs(x) > 5) throw new Error('Pick x between -5 and 5');
        if (c.some(function (v) { return Math.abs(v) > 20; })) throw new Error('Keep coefficients between -20 and 20');
        var f = function (t) { return poly(c, t); }, exact = dpoly(c, x), F = [];
        var xs = [];
        for (var k = -3; k <= 3; k++) xs.push(r3(x + k * 0.5));
        F.push({ narr: 'Our function is <b>f(x) = ' + polyStr(c) + '</b>. The bars show f at points around x = ' + x + ' (the amber bar). We want the <b>slope</b> exactly at the amber point.', parts: [
          curve('f(x) sampled every 0.5', xs, f, x), { type: 'vars', vals: { 'x': x, 'f(x)': r4(f(x)) }, hl: { 'x': 'cur' } }] });
        var rows = [];
        [1, 0.5, 0.1, 0.01, 0.001].forEach(function (h, i) {
          var fw = (f(x + h) - f(x)) / h, ce = (f(x + h) - f(x - h)) / (2 * h);
          rows.push([h, r6(f(x + h)), r6(fw), r6(ce), r6(Math.abs(ce - exact))]);
          F.push({ narr: 'Step h = <b>' + h + '</b>. Rise = f(x + h) − f(x) = ' + r6(f(x + h) - f(x)) + ', so the one-sided slope is ' + r6(fw) + '. The two-sided (central) slope (f(x + h) − f(x − h)) / 2h is <b>' + r6(ce) + '</b>. ' + (i === 0 ? 'A big step gives a rough answer.' : 'Smaller step, closer answer: both columns are settling down.'), parts: [
            { type: 'table', label: 'secant slopes so far', columns: ['h', 'f(x + h)', 'forward slope', 'central slope', '|central − exact|'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[i] = 'cur'; return o; })() },
            { type: 'bars', label: 'central slope estimate for each h', values: rows.map(function (r) { return r[3]; }), idxLabels: rows.map(function (r) { return 'h=' + r[0]; }), hl: (function () { var o = {}; o[i] = 'cur'; return o; })() }] });
        });
        var terms = [];
        c.forEach(function (ci, i) { if (i && ci) terms.push([ci + '·x^' + i, i + '·' + ci + '·x^' + (i - 1), r4(i * ci * Math.pow(x, i - 1))]); });
        if (!terms.length) terms.push(['constant', '0', 0]);
        F.push({ narr: 'Now the exact answer with the <b>power rule</b>: each term c·xⁿ becomes n·c·xⁿ⁻¹, constants vanish. Add the pieces at x = ' + x + '.', parts: [
          { type: 'table', label: 'power rule, term by term', columns: ['term', 'derivative', 'value at x'], rows: terms } ,
          { type: 'vars', vals: { "f′(x) exact": r6(exact) }, hl: { "f′(x) exact": 'ok' } }] });
        F.push({ narr: 'Compare: the central slope with h = 0.001 differs from the exact ' + r6(exact) + ' by only ' + rows[4][4] + '. ' + (exact > 0 ? 'Positive slope: f is going <b>uphill</b> here, so to make f smaller we would move x <b>left</b>.' : exact < 0 ? 'Negative slope: f is going <b>downhill</b> here, so moving x <b>right</b> makes f smaller.' : 'Slope zero: a <b>flat point</b> (a minimum, maximum or shelf).'), parts: [
          curve('f(x) with the point', xs, f, x, exact === 0 ? 'sel' : 'ok'), { type: 'vars', vals: { 'exact f′(x)': r6(exact), 'central estimate (h=0.001)': rows[4][3], 'direction to decrease f': exact > 0 ? '← left' : exact < 0 ? 'right →' : 'none (flat)' }, hl: { 'direction to decrease f': 'sel' } }] });
        return F;
      }
    },
    examples: [
      { title: 'Derivative of a loss, read as advice', html: `<p>Loss <code>L(w) = (w − 4)²</code> (smallest at w = 4). Derivative <code>L′(w) = 2(w − 4)</code>. At w = 1: L′ = <span class="c-r">−6</span>. Negative means "increasing w lowers the loss", and 6 says it is fairly steep. At w = 5: L′ = <span class="c-g">+2</span>, so decrease w. At w = 4: L′ = 0, the bottom. Gradient descent is nothing more than following this advice in small steps.</p>` },
      { title: 'Power rule on a polynomial', html: `<p><code>f(x) = 4x³ − 5x² + 7x − 9</code>. Term by term: 12x², −10x, 7, 0. So <code>f′(x) = 12x² − 10x + 7</code>. At x = 1: 12 − 10 + 7 = <b>9</b>. Numeric check with h = 0.001: (f(1.001) − f(0.999)) / 0.002 = 9.000004, which agrees.</p>`, code: { lang: 'python', run: true, code: `f = lambda x: 4 * x**3 - 5 * x**2 + 7 * x - 9
df = lambda x: 12 * x**2 - 10 * x + 7
h = 1e-3
print("analytic:", df(1.0))
print("central :", (f(1 + h) - f(1 - h)) / (2 * h))
` } },
      { title: 'Sigmoid slope at a few points', html: `<p>σ(0) = 0.5, so σ′(0) = 0.5 × 0.5 = <b>0.25</b> (the steepest it ever gets). σ(4) ≈ 0.982, so σ′(4) ≈ 0.982 × 0.018 ≈ <span class="c-r">0.018</span>. Far from 0 the sigmoid is almost flat: its slope is tiny. This "saturation" is why deep networks with sigmoid layers learned slowly (vanishing gradients) and why ReLU took over.</p>`, code: { lang: 'python', run: true, code: `import math
sig = lambda z: 1 / (1 + math.exp(-z))
for z in [0, 1, 2, 4, 8]:
    s = sig(z)
    print(f"z={z}:  sigma={s:.4f}  slope={s * (1 - s):.5f}")
` } },
      { title: 'Product rule in one line', html: `<p><code>f(x) = x · eˣ</code>. Product rule: (first)′·second + first·(second)′ = 1·eˣ + x·eˣ = <code>(1 + x)eˣ</code>. At x = 0 the slope is 1. At x = −1 it is 0: a flat point (the minimum of x·eˣ).</p>` }
    ],
    deepDive: `<p><b>🟣 Why the central difference is better.</b> Taylor's theorem says f(x + h) = f(x) + h·f′(x) + h²/2·f″(x) + h³/6·f‴(x) + … Subtract f(x) and divide by h: the forward slope is f′(x) + h/2·f″(x) + …, so its error is proportional to h. Subtract f(x − h) from f(x + h) instead and the f″ terms cancel: the central slope is f′(x) + h²/6·f‴(x) + …, error proportional to h². With h = 10<sup>−3</sup> that is 10<sup>−6</sup> instead of 10<sup>−3</sup>.</p>
      <p><b>Why not use h = 10<sup>−15</sup>?</b> Doubles hold about 16 significant digits. When h is tiny, f(x + h) and f(x − h) agree in almost all digits, so their difference keeps only a few true digits (catastrophic cancellation), and the error grows like ε/h with ε ≈ 10<sup>−16</sup>. Balancing h² against ε/h gives the sweet spot near h ≈ 10<sup>−5</sup> for central differences in float64. In float32 (ε ≈ 10<sup>−7</sup>) numeric checks are much worse, which is why gradient checks are done in float64.</p>
      <p><b>Second derivative = curvature.</b> f″ is the slope of the slope. f″ &gt; 0 means the curve bends up like a bowl (a flat point there is a minimum); f″ &lt; 0 bends down (a maximum). Curvature also controls how big a gradient-descent step can be, as you will see in the learning-rate topic.</p>
      <p><b>Non-smooth points.</b> ReLU has a corner at 0 and |x| has a corner at 0: the left and right slopes differ, so there is no derivative there. Frameworks simply pick a value (PyTorch uses 0 for ReLU at exactly 0). Because hitting exactly 0.0 is rare with real-valued weights, this works fine in practice, and the theory is covered by "subgradients".</p>`,
    aiEra: `<p><b>🤖 Where you meet this in AI work.</b> You will almost never differentiate by hand at work: PyTorch, JAX and TensorFlow do <b>automatic differentiation</b>. But you still need the intuition to read training curves (a loss that stops moving often means near-zero slopes), to pick activations (saturated sigmoids have tiny slopes), and to debug custom layers or losses, where a wrong derivative trains silently but badly.</p>
      <p><b>Working with AI assistants.</b> Assistants are good at symbolic derivatives but occasionally drop a factor of 2 or a minus sign. A two-line central-difference check settles it in seconds and does not depend on trusting anyone. Ask the assistant for the analytic formula <i>and</i> a numeric check, in float64, and compare at a few random points. If you write a custom <code>torch.autograd.Function</code>, run <code>torch.autograd.gradcheck</code> on it before training.</p>`,
    problems: [
      PR('deriv', {
        title: 'Derivative of a Polynomial at a Point', level: 'Easy', tags: ['derivatives', 'power rule'], companies: ['Google', 'Meta'],
        statement: `<p>A polynomial is given by its coefficients: <code>coeffs[i]</code> is the number in front of x<sup>i</sup>, so <code>[5, −2, 0, 1]</code> means 5 − 2x + x³. Write <code>derivative_at(coeffs, x)</code> that returns the exact slope f′(x).</p>`,
        constraints: `<p>1 ≤ len(coeffs) ≤ 20. |x| ≤ 100. Answers compared with a small tolerance.</p>`,
        example: `<p><code>coeffs = [5, −2, 0, 1]</code>, <code>x = 2</code> → <code class="c-g">10.0</code>. Why: f′(x) = −2 + 3x², and at x = 2 that is −2 + 12 = 10.</p>
          <p><code>coeffs = [7]</code> (a constant) → <code class="c-y">0.0</code> at any x.</p>`,
        bruteWhy: `<p>The naive way estimates the slope numerically with a tiny forward step. It is close, but never exact (its error is about h·f″/2 plus round-off), and it needs two evaluations of the whole polynomial. The power rule gives the exact value directly.</p>`,
        mcq: { q: `What is the derivative of <code>3x⁴</code>?`, options: ['12x³', '3x³', '12x⁴', '4x³'], answer: 0, explain: `Power rule: bring the 4 down and multiply: 4 × 3 = 12, then lower the power by one: x³.` },
        hints: [
          `Hint 1: The derivative of a sum is the sum of the derivatives, so handle one term c·x^i at a time.`,
          `Hint 2: Power rule: c·x^i becomes i·c·x^(i−1). Loop with enumerate(coeffs) to get i and c together.`,
          `Hint 3: Skip i = 0 (a constant has slope 0, and x**(−1) would fail at x = 0). Recipe: total = 0; for each i ≥ 1 add i·c·x^(i−1); return total.`
        ],
        approach: `<p>Apply the power rule to each term and add the results. The constant term contributes nothing. One pass over the coefficients.</p>`,
        dry: { head: ['i', 'c', 'i·c·x^(i−1) at x = 2', 'running total'], rows: [['0', '5', 'skip (constant)', '0'], ['1', '−2', '1·(−2)·1 = −2', '−2'], ['2', '0', '0', '−2'], ['3', '1', '3·1·4 = 12', '10']] },
        complexity: `<p>O(n) multiplications for n coefficients (O(n log n) if you count the powers; Horner's scheme makes it a clean O(n)). O(1) extra space.</p>`,
        followUps: ['How would you return the derivative polynomial itself (its coefficients)?', 'Rewrite it with Horner\'s method so each step is one multiply and one add.']
      })
    ]
  });

  // ===================== TOPIC 2: CHAIN RULE =====================
  topics.push({
    title: 'The Chain Rule and Computational Graphs',
    analogy: `<p>Three gears are linked. Turning gear A once turns gear B <b>3 times</b>, and each turn of B turns gear C <b>2 times</b>. How many times does C turn per turn of A? <b>3 × 2 = 6</b>. You multiply the rates along the chain. That is the whole chain rule. A neural network is a long chain of gears (layers), and backpropagation multiplies the "turn rates" from the loss all the way back to every weight.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> When one quantity feeds into another, which feeds into a third, the rate of change from start to end is the <b>product of the rates of each link</b>. If <code>y = f(u)</code> and <code>u = g(x)</code>, then</p>
      <p style="text-align:center"><b>dy/dx = dy/du × du/dx</b></p>
      <h4>1. A first example</h4>
      <p><code>y = (3x + 1)²</code>. Inner part <code>u = 3x + 1</code> (rate du/dx = 3). Outer part <code>y = u²</code> (rate dy/du = 2u). So dy/dx = 2u × 3 = 6(3x + 1). At x = 1: u = 4, dy/dx = 2·4·3 = <b class="c-g">24</b>. Check numerically: y(1.001) − y(0.999) = 16.024009 − 15.976009 = 0.048, divided by 0.002 gives 24. ✓</p>
      <h4>2. Draw it as a computational graph</h4>
      <p>Write the formula as boxes, one simple operation each. The <b>forward pass</b> computes values left to right. The <b>backward pass</b> starts with "dL/dL = 1" at the end and walks right to left, multiplying by each box's <b>local derivative</b>.</p>
      ${H.table(['box', 'forward (x=1)', 'local derivative', 'backward: dy/d(box)'], [['x', '1', '', '<span class="c-g">2u·3 = 24</span>'], ['u = 3x + 1', '4', 'du/dx = 3', '2u = 8'], ['y = u²', '16', 'dy/du = 2u = 8', '1 (start here)']])}
      <h4>3. The ML version: one neuron with a squared error</h4>
      <p>A neuron computes <code>z = w·x + b</code>, then <code>a = σ(z)</code>, then the loss <code>L = (a − y)²</code>. With <code>w = 0.5, b = 0.1, x = 2, y = 1</code>:</p>
      ${H.table(['step', 'forward value', 'local slope', 'chain so far'], [
        ['z = w·x + b', '1.1', 'dz/dw = x = 2, dz/db = 1', ''],
        ['a = σ(z)', '0.7503', 'da/dz = a(1 − a) = 0.1874', ''],
        ['L = (a − y)²', '0.0624', 'dL/da = 2(a − y) = −0.4995', 'start: −0.4995'],
        ['back to z', '', '', '−0.4995 × 0.1874 = −0.0936'],
        ['back to w, b', '', '', '<span class="c-g">dL/dw = −0.0936 × 2 = −0.1872, dL/db = −0.0936</span>']
      ])}
      <p>Both gradients are negative, so increasing w and b lowers the loss: the neuron's output 0.75 is below the target 1 and needs to go up. Makes sense.</p>
      <h4>4. When a value feeds two places: add the paths</h4>
      <p>If x is used twice, as in <code>f = x·x</code> or a weight shared across time steps, the total derivative is the <b>sum</b> over every path from x to the output. For <code>f = x·x</code>: path 1 gives x, path 2 gives x, total 2x. ✓ This "multiply along a path, add across paths" rule is exactly what backpropagation implements.</p>`,
    clues: [
      '"function of a function", "composition", "nested" → chain rule: multiply the local slopes',
      '"how does the loss change with respect to a weight deep inside" → backward pass through the computational graph',
      '"a variable used in several places" (shared weights, residual connections) → add the gradients from every path',
      '"vanishing / exploding gradients" → a long product of local slopes that are all &lt; 1 or all &gt; 1',
      '"implement autograd / micrograd" → each node stores its value and a function that pushes its gradient to its inputs',
      '"forward pass caches activations" → the backward pass needs the forward values (memory cost of training)'
    ],
    code: [
      { lang: 'python', title: 'Chain rule through a small composition, checked numerically (runnable)', run: true, code: `import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

def loss(w, b, x, y):
    # L = (sigmoid(w*x + b) - y)^2 : three boxes chained together
    return (sigmoid(w * x + b) - y) ** 2

w, b, x, y = 0.5, 0.1, 2.0, 1.0

# ---- forward pass: keep every middle value ----
z = w * x + b
a = sigmoid(z)
L = (a - y) ** 2
print(f"forward:  z={z:.4f}  a={a:.4f}  L={L:.4f}")

# ---- backward pass: multiply local slopes from the end ----
dL_da = 2 * (a - y)
da_dz = a * (1 - a)
dL_dz = dL_da * da_dz
dL_dw = dL_dz * x          # dz/dw = x
dL_db = dL_dz * 1.0        # dz/db = 1
print(f"backward: dL/da={dL_da:.4f}  dL/dz={dL_dz:.4f}  dL/dw={dL_dw:.4f}  dL/db={dL_db:.4f}")

# ---- numeric check: nudge w and b a tiny bit ----
h = 1e-5
num_w = (loss(w + h, b, x, y) - loss(w - h, b, x, y)) / (2 * h)
num_b = (loss(w, b + h, x, y) - loss(w, b - h, x, y)) / (2 * h)
print(f"numeric:  dL/dw={num_w:.4f}  dL/db={num_b:.4f}")
print("match:", abs(num_w - dL_dw) < 1e-8 and abs(num_b - dL_db) < 1e-8)
` },
      { lang: 'python', title: 'A 30-line autograd engine (runnable): how PyTorch does it, in miniature', run: true, code: `import math

class Value:
    """A number that remembers how it was made, so it can send gradients back."""
    def __init__(self, data, parents=()):
        self.data, self.grad = data, 0.0
        self._parents = parents
        self._backward = lambda: None      # how to push my grad to my parents

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other))
        def _backward():                    # d(a+b)/da = 1, d(a+b)/db = 1
            self.grad += out.grad
            other.grad += out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other))
        def _backward():                    # d(ab)/da = b, d(ab)/db = a
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,))
        def _backward():                    # d tanh(u)/du = 1 - tanh(u)^2
            self.grad += (1 - t * t) * out.grad
        out._backward = _backward
        return out

    def backward(self):
        # visit nodes so that every node comes after everything it depends on
        order, seen = [], set()
        def visit(v):
            if id(v) not in seen:
                seen.add(id(v))
                for p in v._parents:
                    visit(p)
                order.append(v)
        visit(self)
        self.grad = 1.0                     # dL/dL = 1
        for v in reversed(order):           # walk from the output back to the inputs
            v._backward()

# y = tanh(w*x + b), and x is used twice in f = x*x to show "add the paths"
x, w, b = Value(2.0), Value(-0.5), Value(0.3)
y = (w * x + b).tanh()
y.backward()
print("y =", round(y.data, 4), " dy/dw =", round(w.grad, 4), " dy/dx =", round(x.grad, 4))

q = Value(3.0)
f = q * q
f.backward()
print("d(q*q)/dq at 3 =", q.grad, "(two paths, 3 + 3)")
` },
      { lang: 'python', title: 'The same neuron in PyTorch (shown, not run here)', code: `import torch

w = torch.tensor(0.5, requires_grad=True)
b = torch.tensor(0.1, requires_grad=True)
x, y = torch.tensor(2.0), torch.tensor(1.0)

L = (torch.sigmoid(w * x + b) - y) ** 2   # PyTorch records the graph as it runs
L.backward()                              # backward pass: the chain rule, automatically
print(w.grad, b.grad)                     # tensor(-0.1872) tensor(-0.0936)
` }
    ],
    codeTitle: ['Chain rule by hand', 'Mini autograd', 'PyTorch'],
    viz: {
      title: 'Forward then backward through one neuron',
      input: '0.5 0.1 2 1',
      inputLabel: 'w b x y   (weight, bias, input, target)',
      gen: function (input) {
        var v = nums(input, 'w b x y', 4);
        if (v.length !== 4) throw new Error('Enter exactly four numbers: w b x y, e.g. 0.5 0.1 2 1');
        if (v.some(function (t) { return Math.abs(t) > 10; })) throw new Error('Keep every number between -10 and 10');
        var w = v[0], b = v[1], x = v[2], y = v[3];
        var z = w * x + b, a = sig(z), L = (a - y) * (a - y);
        var dLa = 2 * (a - y), daz = a * (1 - a), dLz = dLa * daz, dLw = dLz * x, dLb = dLz;
        var nodes = [
          { id: 'w', label: 'w', x: 8, y: 12 }, { id: 'x', label: 'x', x: 8, y: 30 }, { id: 'b', label: 'b', x: 8, y: 48 },
          { id: 'z', label: 'z=wx+b', x: 36, y: 30, shape: 'box' }, { id: 'a', label: 'a=σ(z)', x: 62, y: 30, shape: 'box' },
          { id: 'L', label: 'L=(a−y)²', x: 88, y: 30, shape: 'box' }, { id: 'y', label: 'y', x: 88, y: 52 }];
        var edges = [['w', 'z'], ['x', 'z'], ['b', 'z'], ['z', 'a'], ['a', 'L'], ['y', 'L']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'computational graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags }; }
        var fv = { w: 'w=' + w, x: 'x=' + x, b: 'b=' + b, y: 'y=' + y };
        var F = [];
        F.push({ narr: 'The neuron as a <b>computational graph</b>: each box does one simple job. Inputs on the left (w, x, b), the loss L on the right. First we run it <b>forward</b>.', parts: [g({ w: 'cur', x: 'cur', b: 'cur' }, {}, fv)] });
        F.push({ narr: 'Forward box 1: <b>z = w·x + b</b> = ' + w + '·' + x + ' + ' + b + ' = <b>' + r4(z) + '</b>.', parts: [g({ z: 'cur' }, { 'w-z': 'cur', 'x-z': 'cur', 'b-z': 'cur' }, Object.assign({}, fv, { z: r4(z) }))] });
        F.push({ narr: 'Forward box 2: <b>a = σ(z)</b> = 1 / (1 + e<sup>−' + r4(z) + '</sup>) = <b>' + r4(a) + '</b>. The sigmoid squashes z into (0, 1).', parts: [g({ a: 'cur' }, { 'z-a': 'cur' }, Object.assign({}, fv, { z: r4(z), a: r4(a) }))] });
        F.push({ narr: 'Forward box 3: <b>L = (a − y)²</b> = (' + r4(a) + ' − ' + y + ')² = <b>' + r4(L) + '</b>. Forward pass done; we kept z and a because the backward pass needs them.', parts: [g({ L: 'cur' }, { 'a-L': 'cur', 'y-L': 'cur' }, Object.assign({}, fv, { z: r4(z), a: r4(a), L: r4(L) })),
          { type: 'vars', vals: { z: r4(z), a: r4(a), L: r4(L) } }] });
        var bt = { L: 'dL/dL=1' };
        F.push({ narr: 'Backward starts at the end with <b>dL/dL = 1</b> (changing L by 1 changes L by 1).', parts: [g({ L: 'sel' }, {}, bt), { type: 'vars', vals: { 'dL/dL': 1 }, hl: { 'dL/dL': 'sel' } }] });
        bt = { L: '1', a: 'dL/da=' + r4(dLa) };
        F.push({ narr: 'Local slope of the loss box: dL/da = 2(a − y) = <b>' + r4(dLa) + '</b>. ' + (dLa < 0 ? 'Negative: a is below the target, so raising a lowers L.' : 'Positive: a is above the target, so lowering a lowers L.'), parts: [g({ a: 'sel' }, { 'a-L': 'sel' }, bt), { type: 'vars', vals: { 'dL/da': r4(dLa) }, hl: { 'dL/da': 'sel' } }] });
        bt = { L: '1', a: r4(dLa), z: 'dL/dz=' + r4(dLz) };
        F.push({ narr: 'Through the sigmoid: its local slope is a(1 − a) = ' + r4(daz) + '. <b>Chain rule</b>: dL/dz = dL/da × da/dz = ' + r4(dLa) + ' × ' + r4(daz) + ' = <b>' + r4(dLz) + '</b>.', parts: [g({ z: 'sel' }, { 'z-a': 'sel' }, bt), { type: 'table', label: 'multiply along the chain', columns: ['link', 'local slope', 'running product'], rows: [['L ← a', r4(dLa), r4(dLa)], ['a ← z', r4(daz), r4(dLz)]], hl: { 1: 'cur' } }] });
        bt = { L: '1', a: r4(dLa), z: r4(dLz), w: 'dL/dw=' + r4(dLw), b: 'dL/db=' + r4(dLb), x: 'dL/dx=' + r4(dLz * w) };
        F.push({ narr: 'Into the inputs: z = w·x + b, so dz/dw = x = ' + x + ' and dz/db = 1. <b>dL/dw = ' + r4(dLz) + ' × ' + x + ' = ' + r4(dLw) + '</b>, <b>dL/db = ' + r4(dLb) + '</b>. (dL/dx = dL/dz × w is also available; deeper networks pass it to the previous layer.)', parts: [g({ w: 'ok', b: 'ok', x: 'win' }, { 'w-z': 'ok', 'b-z': 'ok', 'x-z': 'win' }, bt),
          { type: 'vars', vals: { 'dL/dw': r4(dLw), 'dL/db': r4(dLb) }, hl: { 'dL/dw': 'ok', 'dL/db': 'ok' } }] });
        var h = 1e-5, Lf = function (ww, bb) { var aa = sig(ww * x + bb); return (aa - y) * (aa - y); };
        var nw = (Lf(w + h, b) - Lf(w - h, b)) / (2 * h), nb = (Lf(w, b + h) - Lf(w, b - h)) / (2 * h);
        F.push({ narr: 'Gradient check: nudge w and b by ±0.00001 and measure the loss change. The numeric slopes match the chain-rule answers, so our backward pass is right. A gradient step would now move w by −lr × ' + r4(dLw) + '.', parts: [
          { type: 'table', label: 'analytic vs numeric', columns: ['parameter', 'chain rule', 'numeric', 'difference'], rows: [['w', r6(dLw), r6(nw), r6(Math.abs(dLw - nw))], ['b', r6(dLb), r6(nb), r6(Math.abs(dLb - nb))]], hl: { 0: 'ok', 1: 'ok' } }] });
        return F;
      }
    },
    examples: [
      { title: 'Two links in a chain', html: `<p><code>y = sin(x²)</code> at x = 1. Links: u = x² (slope 2x = 2), y = sin u (slope cos u = cos 1 ≈ 0.5403). Product: dy/dx ≈ 2 × 0.5403 = <b>1.0806</b>. Numeric check (h = 0.001) gives 1.0806.</p>`, code: { lang: 'python', run: true, code: `import math
y = lambda x: math.sin(x * x)
print("chain rule:", 2 * 1 * math.cos(1))
h = 1e-3
print("numeric   :", (y(1 + h) - y(1 - h)) / (2 * h))
` } },
      { title: 'Why gradients vanish', html: `<p>Ten sigmoid layers in a row. Each local slope is at most 0.25. The chain multiplies them: 0.25<sup>10</sup> ≈ <span class="c-r">0.00000095</span>. The first layer barely learns. With ReLU the slope is 1 on the active side, so the product does not shrink, which is one reason deep networks became trainable. If each slope were 1.5 instead, 1.5<sup>10</sup> ≈ 57: <b>exploding</b> gradients, tamed by gradient clipping.</p>` },
      { title: 'Shared weight: add the paths', html: `<p><code>f(w) = w·3 + w·5</code> uses w twice. Path 1 contributes 3, path 2 contributes 5, total <b>8</b>, which matches f(w) = 8w. In an RNN the same weight is used at every time step, so its gradient is the sum over all steps ("backpropagation through time").</p>` },
      { title: 'The neuron gradient, read aloud', html: `<p>With w = 0.5, b = 0.1, x = 2, y = 1 we got dL/dw = −0.187. In words: "raising w by 0.01 lowers the loss by about 0.00187". The size is a product of three things: how wrong we are (a − y), how responsive the sigmoid is at this z (a(1 − a)), and how big the input is (x). A zero input means zero gradient for its weight: nothing to learn from.</p>` }
    ],
    deepDive: `<p><b>🟣 Forward mode vs reverse mode.</b> You can apply the chain rule from the inputs forward (forward-mode autodiff: one pass per input) or from the output backward (reverse mode: one pass per output). A loss is one number but a model has millions or billions of weights, so reverse mode wins: <b>one backward pass gives every gradient</b>, at a cost of roughly 2–3 forward passes. That is what "backpropagation" means.</p>
      <p><b>The memory cost.</b> The backward pass needs the forward values (z, a, every activation). Storing them is why training uses far more memory than inference. <b>Activation checkpointing</b> stores only some of them and recomputes the rest during the backward pass, trading compute for memory.</p>
      <p><b>Jacobians.</b> With vectors, each box has a matrix of local slopes, the Jacobian. The chain rule becomes a product of Jacobians, and reverse mode computes "vector × Jacobian" products without ever building the full matrices. For a linear layer z = W·x, the vector-Jacobian product gives dL/dx = Wᵀ·(dL/dz) and dL/dW = (dL/dz)·xᵀ, which you will use in the backprop topic.</p>
      <p><b>Order matters.</b> A node may only push its gradient back after <i>all</i> its consumers have pushed theirs into it. Autograd engines therefore process nodes in reverse <b>topological order</b> (the mini engine above builds that order with a depth-first search), and they <b>accumulate</b> (+=) gradients, which is why PyTorch needs <code>optimizer.zero_grad()</code> each step.</p>`,
    aiEra: `<p><b>🤖 Where you meet this in AI work.</b> Every <code>loss.backward()</code> call is the chain rule run over a graph with millions of nodes. Knowing that it multiplies local slopes explains residual connections (they add a path whose slope is exactly 1, so the gradient has a highway), why layer normalisation and careful initialisation keep the product near 1, and why forgetting <code>zero_grad()</code> silently adds gradients from the previous batch.</p>
      <p><b>Working with AI assistants.</b> When an assistant writes a custom backward function, ask it to write the forward values and local slopes as a table like the one above, then add a numeric gradient check test. Watch for in-place operations (<code>x += 1</code> on a tensor needed for backward), <code>.detach()</code> or <code>.item()</code> in the middle of a graph (which cuts the chain), and gradients flowing into things that should be frozen.</p>`,
    problems: [
      PR('chain', {
        title: 'Gradients of One Sigmoid Neuron', level: 'Easy', tags: ['chain rule', 'sigmoid', 'backprop'], companies: ['OpenAI', 'Meta'],
        statement: `<p>A neuron computes <code>z = w·x + b</code>, <code>a = σ(z)</code> and the loss <code>L = (a − y)²</code>, where σ is the sigmoid. Write <code>chain_rule_grad(w, b, x, y)</code> that returns <code>[dL/dw, dL/db]</code> using the chain rule.</p>`,
        constraints: `<p>All inputs are floats with |value| ≤ 10. Answers compared with a small tolerance.</p>`,
        example: `<p><code>w = 0, b = 0, x = 1, y = 1</code> → <code class="c-g">[−0.25, −0.25]</code>. Why: z = 0, a = 0.5, dL/da = 2(0.5 − 1) = −1, da/dz = 0.25, so dL/dz = −0.25. Then dL/dw = −0.25 × x = −0.25 and dL/db = −0.25.</p>`,
        bruteWhy: `<p>You could estimate each gradient numerically by nudging w and b and re-running the forward pass (4 forward passes). It works for two parameters, but a real model has millions: that would be millions of forward passes per step. The chain rule gets every gradient from one backward pass.</p>`,
        mcq: { q: `For this neuron, which factor makes dL/dw exactly 0 no matter how wrong the prediction is?`, options: ['x = 0', 'b = 0', 'y = 0', 'w = 0'], answer: 0, explain: `dL/dw = dL/dz × x. If the input is 0, the weight had no influence on the output, so there is nothing to learn for it.` },
        hints: [
          `Hint 1: Run the forward pass first and keep z and a. Every local slope needs them.`,
          `Hint 2: Local slopes: dL/da = 2(a − y), da/dz = a(1 − a), dz/dw = x, dz/db = 1. Multiply along the chain.`,
          `Hint 3: Recipe: z → a → dL/dz = 2(a − y)·a(1 − a) → return [dL/dz·x, dL/dz]. Use math.exp for the sigmoid.`
        ],
        approach: `<p>Forward: z = w·x + b, a = σ(z). Backward: dL/dz = 2(a − y)·a(1 − a), then dL/dw = dL/dz·x and dL/db = dL/dz. This is backpropagation on the smallest possible network.</p>`,
        dry: { head: ['quantity', 'value (w=0.5, b=0.1, x=2, y=1)'], rows: [['z', '1.1'], ['a = σ(z)', '0.7503'], ['dL/da = 2(a − y)', '−0.4995'], ['da/dz = a(1 − a)', '0.1874'], ['dL/dz', '−0.0936'], ['[dL/dw, dL/db]', '[−0.1872, −0.0936]']] },
        complexity: `<p>O(1): a fixed handful of arithmetic operations, about the cost of two forward passes.</p>`,
        followUps: ['How do the formulas change if the loss is binary cross-entropy instead of squared error?', 'What is dL/dx, and when would you need it?']
      })
    ]
  });

  // ===================== TOPIC 3: PARTIAL DERIVATIVES AND GRADIENTS =====================
  topics.push({
    title: 'Partial Derivatives and the Gradient Vector',
    analogy: `<p>You are standing on a hillside in fog. You cannot see the valley, but you can feel the ground under your feet. Take one small step <b>east</b>: did you go up or down, and by how much? Now one small step <b>north</b>. Those two answers are the <b>partial derivatives</b>. Put them together as an arrow and you get the <b>gradient</b>: the direction that goes uphill fastest. To get down to the valley (low loss), walk the <i>opposite</i> way.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A model's loss depends on many weights at once: <code>L(w₁, w₂, …, wₙ)</code>. A <b>partial derivative</b> <code>∂L/∂w₁</code> asks: "if I nudge only w₁ and freeze all the others, how fast does L change?" The curly ∂ just means "partial: the others are held still".</p>
      <h4>1. Computing a partial: treat the others as numbers</h4>
      <p>Take <code>f(x, y) = x² + 3y²</code> (a bowl, lowest at (0, 0)).</p>
      <ul><li>∂f/∂x: pretend y is a fixed number, so 3y² is a constant. Answer <code>2x</code>.</li><li>∂f/∂y: pretend x is fixed. Answer <code>6y</code>.</li></ul>
      <p>At the point (1, 1): ∂f/∂x = 2, ∂f/∂y = 6. Moving in y is three times as steep as moving in x.</p>
      ${H.table(['nudge', 'f before', 'f after', 'change ÷ 0.01', 'partial'], [['x: 1 → 1.01', '4', '4.0201', '2.01', '∂f/∂x ≈ 2'], ['y: 1 → 1.01', '4', '4.0603', '6.03', '∂f/∂y ≈ 6']])}
      <h4>2. The gradient: all partials in one vector</h4>
      <p><code>∇f = [∂f/∂x, ∂f/∂y]</code> (∇ is read "nabla" or "grad"). At (1, 1): <code>∇f = [2, 6]</code>. Three facts make it the most useful vector in ML:</p>
      <ol><li>It points in the direction of <b class="c-g">steepest increase</b>.</li><li>Its length √(2² + 6²) ≈ 6.32 is <b>how steep</b> that direction is.</li><li><b class="c-r">−∇f</b> points <b>steepest downhill</b>. Gradient descent steps that way.</li></ol>
      <h4>3. Slope in any direction: a dot product</h4>
      <p>For a unit direction u, the slope along u is <code>∇f · u</code> (the <b>directional derivative</b>, using the dot product from linear algebra). Along x: [2, 6]·[1, 0] = 2. Along y: 6. Along the gradient itself, [2, 6]·[2, 6]/6.32 = 6.32, the biggest possible. Perpendicular to it, [2, 6]·[3, −1]/3.16 = 0: you walk along a contour line where f does not change.</p>
      <h4>4. Gradients of the functions ML uses</h4>
      ${H.table(['function of vector w', 'gradient', 'note'], [
        ['w · x + b (a linear model\'s output)', 'x', 'the inputs themselves'],
        ['‖w‖² = w₁² + … + wₙ²', '2w', 'used by L2 regularisation'],
        ['(w · x − y)²', '2(w · x − y)·x', 'error × input'],
        ['mean over n rows of (Xw − y)²', '(2/n)·Xᵀ(Xw − y)', 'linear regression in matrix form']
      ])}
      <p>The last row joins the two maths modules: the gradient of the mean squared error is a transpose times a vector, straight from linear algebra.</p>
      <h4>5. A gradient has the same shape as the parameters</h4>
      <p>If a layer's weight matrix is 512×256, its gradient is also 512×256: one partial derivative per weight. That is what <code>param.grad</code> holds in PyTorch, and why the optimiser can do <code>w ← w − lr·grad</code> element by element.</p>`,
    clues: [
      '"a function of several variables", "many weights" → partial derivatives, one per variable',
      '"direction of steepest ascent / descent" → ∇f and −∇f',
      '"rate of change in direction u" → directional derivative ∇f · u (u of length 1)',
      '"gradient of the loss with respect to the weight vector / matrix" → same shape as the parameters',
      '"gradient is zero" → a stationary point: minimum, maximum or saddle',
      '"gradient of ‖w‖²" → 2w; "gradient of w·x" → x'
    ],
    code: [
      { lang: 'python', title: 'Partial derivatives, the gradient and the steepest direction (runnable)', run: true, code: `import math

def f(x, y):
    return x * x + 3 * y * y          # a bowl, lowest at (0, 0)

def grad_f(x, y):
    return [2 * x, 6 * y]             # partials worked out by hand

x, y = 1.0, 1.0
g = grad_f(x, y)
print("gradient at (1, 1):", g, " length:", round(math.hypot(*g), 4))

# numeric partials: nudge one variable at a time, freeze the other
h = 1e-5
num = [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)]
print("numeric gradient  :", [round(v, 6) for v in num])

# try 8 directions of length 1: which one increases f fastest?
print("direction   slope (= grad . u)")
for k in range(8):
    ang = k * math.pi / 4
    u = [math.cos(ang), math.sin(ang)]
    slope = g[0] * u[0] + g[1] * u[1]
    print(f"{k * 45:3d} deg    {slope:7.3f}")
best = [g[0] / math.hypot(*g), g[1] / math.hypot(*g)]
print("the gradient direction", [round(v, 3) for v in best], "gives the max slope", round(math.hypot(*g), 3))

# one small step AGAINST the gradient lowers f
lr = 0.1
x2, y2 = x - lr * g[0], y - lr * g[1]
print(f"f before {f(x, y):.3f} -> after one downhill step {f(x2, y2):.3f}")
` },
      { lang: 'python', title: 'Gradient of a vector function in PyTorch (shown, not run here)', code: `import torch

w = torch.tensor([1.0, 1.0], requires_grad=True)
f = w[0] ** 2 + 3 * w[1] ** 2
f.backward()
print(w.grad)          # tensor([2., 6.])  same shape as w

# gradient of the mean squared error of a linear model, two ways
X = torch.tensor([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])
y = torch.tensor([1.0, 2.0, 3.0])
w = torch.zeros(2, requires_grad=True)
loss = ((X @ w - y) ** 2).mean()
loss.backward()
print(w.grad)                                          # autograd
print(2 / len(y) * X.T @ (X @ w.detach() - y))         # formula (2/n) X^T (Xw - y): same numbers
` }
    ],
    codeTitle: ['Pure Python', 'PyTorch'],
    viz: {
      title: 'Feeling the slope east and north, then finding the steepest way',
      input: '1 3 | 1 1',
      inputLabel: 'a c | x y   for f(x, y) = a·x² + c·y²',
      gen: function (input) {
        var p = splitBar(input, 2, '1 3 | 1 1');
        var ac = nums(p[0], 'a c', 2), pt = nums(p[1], 'x y', 2);
        if (ac.length !== 2 || pt.length !== 2) throw new Error('Two numbers on each side, e.g. 1 3 | 1 1');
        var a = ac[0], c = ac[1], x = pt[0], y = pt[1];
        if (Math.abs(a) > 5 || Math.abs(c) > 5) throw new Error('Keep a and c between -5 and 5');
        if (Math.abs(x) > 3 || Math.abs(y) > 3) throw new Error('Keep x and y between -3 and 3');
        var f = function (u, v) { return a * u * u + c * v * v; };
        var gx = 2 * a * x, gy = 2 * c * y, gl = Math.sqrt(gx * gx + gy * gy), F = [];
        var cols = [x - 1, x - 0.5, x, x + 0.5, x + 1], rowsY = [y + 1, y + 0.5, y, y - 0.5, y - 1];
        var grid = rowsY.map(function (v) { return cols.map(function (u) { return r3(f(u, v)); }); });
        var gh = {}; gh['2,2'] = 'cur';
        F.push({ narr: 'The surface <b>f(x, y) = ' + a + 'x² + ' + c + 'y²</b>, shown as a table of heights around our point (' + x + ', ' + y + ') in amber. Rows are y (top = larger y), columns are x.', parts: [
          { type: 'grid', label: 'height f at nearby points', rows: grid, rowHead: rowsY.map(function (v) { return 'y=' + r3(v); }), colHead: cols.map(function (u) { return 'x=' + r3(u); }), hl: gh }] });
        var h = 0.01, dx = (f(x + h, y) - f(x, y)) / h, dy = (f(x, y + h) - f(x, y)) / h;
        var gh2 = { '2,2': 'cur', '2,3': 'ok' };
        F.push({ narr: 'Step <b>east</b> (x up by 0.01, y frozen): f goes ' + r4(f(x, y)) + ' → ' + r4(f(x + h, y)) + ', a change of ' + r4(dx) + ' per unit. Exact partial ∂f/∂x = 2·a·x = <b>' + r4(gx) + '</b>.', parts: [
          { type: 'grid', label: 'moving along x only', rows: grid, rowHead: rowsY.map(function (v) { return 'y=' + r3(v); }), colHead: cols.map(function (u) { return 'x=' + r3(u); }), hl: gh2 },
          { type: 'vars', vals: { '∂f/∂x': r4(gx) }, hl: { '∂f/∂x': 'ok' } }] });
        var gh3 = { '2,2': 'cur', '1,2': 'ok' };
        F.push({ narr: 'Step <b>north</b> (y up by 0.01, x frozen): change ' + r4(dy) + ' per unit. Exact partial ∂f/∂y = 2·c·y = <b>' + r4(gy) + '</b>.', parts: [
          { type: 'grid', label: 'moving along y only', rows: grid, rowHead: rowsY.map(function (v) { return 'y=' + r3(v); }), colHead: cols.map(function (u) { return 'x=' + r3(u); }), hl: gh3 },
          { type: 'vars', vals: { '∂f/∂x': r4(gx), '∂f/∂y': r4(gy) }, hl: { '∂f/∂y': 'ok' } }] });
        var k = gl ? 1.2 / gl : 0;
        var nodes = [{ id: 'P', label: 'P', x: 50, y: 30 }, { id: 'G', label: '∇f', x: r3(50 + 30 * k * gx), y: r3(30 - 30 * k * gy) }, { id: 'D', label: '−∇f', x: r3(50 - 30 * k * gx), y: r3(30 + 30 * k * gy) }];
        F.push({ narr: 'Stack the partials into the <b>gradient ∇f = [' + r4(gx) + ', ' + r4(gy) + ']</b>. Its length ' + r4(gl) + ' is the steepest slope available here. The green arrow points uphill fastest; the red one (−∇f) points downhill fastest.', parts: [
          { type: 'graph', label: 'gradient arrows from P (drawn to a fixed length)', directed: true, height: 60, nodes: gl ? nodes : [nodes[0]], edges: gl ? [['P', 'G'], ['P', 'D']] : [], hl: { P: 'cur', G: 'ok', D: 'bad' }, ehl: { 'P-G': 'ok', 'P-D': 'bad' }, tags: { P: '(' + x + ', ' + y + ')', G: '[' + r3(gx) + ', ' + r3(gy) + ']' } }] });
        var slopes = [], labels = [], best = 0;
        for (var i = 0; i < 8; i++) {
          var ang = i * Math.PI / 4, s = gx * Math.cos(ang) + gy * Math.sin(ang);
          slopes.push(r3(s)); labels.push(i * 45 + '°');
          if (s > slopes[best]) best = i;
        }
        var hb = {}; hb[best] = 'ok';
        F.push({ narr: 'Check it: the slope along a unit direction u is <b>∇f · u</b>. Of 8 compass directions (0° = east, 90° = north) the biggest is ' + labels[best] + ' with ' + slopes[best] + ', closest to the gradient direction; the true maximum, along ∇f exactly, is ' + r3(gl) + '. Opposite directions give negative slopes.', parts: [
          { type: 'bars', label: 'slope ∇f·u for 8 directions', values: slopes, idxLabels: labels, hl: hb }] });
        var lr = 0.1, x2 = x - lr * gx, y2 = y - lr * gy;
        F.push({ narr: 'Take one small step <b>against</b> the gradient with step size 0.1: (' + x + ', ' + y + ') → (' + r4(x2) + ', ' + r4(y2) + '). f goes from ' + r4(f(x, y)) + ' to <b>' + r4(f(x2, y2)) + '</b>. Repeating this is gradient descent, the next topic.', parts: [
          { type: 'table', label: 'one downhill step', columns: ['', 'x', 'y', 'f'], rows: [['before', x, y, r4(f(x, y))], ['− 0.1 × ∇f', r4(-lr * gx), r4(-lr * gy), ''], ['after', r4(x2), r4(y2), r4(f(x2, y2))]], hl: { 2: f(x2, y2) <= f(x, y) ? 'ok' : 'bad' } }] });
        return F;
      }
    },
    examples: [
      { title: 'Partials of a mixed term', html: `<p><code>f(x, y) = x²y + 3y</code> at (2, 1). ∂f/∂x: y is a constant, so 2x·y = 2·2·1 = <b>4</b>. ∂f/∂y: x is a constant, so x² + 3 = 4 + 3 = <b>7</b>. ∇f = [4, 7].</p>`, code: { lang: 'python', run: true, code: `f = lambda x, y: x * x * y + 3 * y
h = 1e-5
print("df/dx ~", round((f(2 + h, 1) - f(2 - h, 1)) / (2 * h), 6))   # 4
print("df/dy ~", round((f(2, 1 + h) - f(2, 1 - h)) / (2 * h), 6))   # 7
` } },
      { title: 'Gradient of a linear model\'s squared error', html: `<p>Prediction <code>ŷ = w₁x₁ + w₂x₂</code>, loss <code>(ŷ − y)²</code>. With x = [3, 1], w = [0.5, 2], y = 4: ŷ = 1.5 + 2 = 3.5, error −0.5. Gradient = 2·error·x = 2·(−0.5)·[3, 1] = <b>[−3, −1]</b>. The weight on the bigger input gets the bigger push.</p>` },
      { title: 'Saddle point: zero gradient but not a minimum', html: `<p><code>f(x, y) = x² − y²</code> at (0, 0): ∇f = [2x, −2y] = [0, 0]. Yet along x it is a valley floor and along y it is a ridge top, like a horse saddle. In high-dimensional neural network losses, saddle points are far more common than bad local minima; noisy gradient steps tend to slide off them.</p>` },
      { title: 'Directional derivative', html: `<p>For ∇f = [2, 6], the direction u = [0.6, 0.8] (length 1) has slope 2·0.6 + 6·0.8 = <b>6.0</b>, a bit less than the maximum 6.32 along ∇f itself. The direction [0.949, −0.316] (perpendicular to ∇f) has slope ≈ 0: a contour line.</p>` }
    ],
    deepDive: `<p><b>🟣 Why the gradient is the steepest direction.</b> For a tiny step δ the change in f is approximately ∇f · δ (the multivariable version of "slope × run"). Among steps of a fixed length, the dot product is largest when δ points the same way as ∇f (cosine = 1, from the linear algebra module). So ∇f is steepest ascent, −∇f steepest descent, and directions at 90° leave f unchanged to first order, which is why the gradient is always perpendicular to contour lines.</p>
      <p><b>The Hessian: curvature in many directions.</b> The matrix of second partials H<sub>ij</sub> = ∂²f/∂x<sub>i</sub>∂x<sub>j</sub> describes how the gradient itself changes. For f = x² + 3y², H = [[2, 0], [0, 6]]: the bowl is 3× steeper-curving in y. The ratio of its largest to smallest eigenvalue (the <b>condition number</b>, here 3) predicts how badly plain gradient descent zig-zags. At a stationary point, all-positive eigenvalues mean a minimum, mixed signs mean a saddle. Hessians are too big to store for real networks (n² entries), so practical methods use Hessian-vector products or approximations.</p>
      <p><b>Numeric gradients cost 2n evaluations</b> (two per parameter), versus about 2–3 forward passes for backpropagation. That ratio, millions to one for real models, is why numeric gradients are only for testing.</p>
      <p><b>Gradients and units.</b> If x is measured in metres in one feature and in millimetres in another, the partials have wildly different sizes and one learning rate cannot suit both. Standardising features (subtract mean, divide by standard deviation) makes the loss bowl rounder, so the gradient points closer to the minimum.</p>`,
    aiEra: `<p><b>🤖 Where you meet this in AI work.</b> After <code>loss.backward()</code>, every parameter tensor has a <code>.grad</code> of the same shape: the gradient, split per tensor. Monitoring the <b>gradient norm</b> (its length, across all parameters) is a standard training health check: a sudden spike signals instability and is why LLM training uses gradient clipping at a norm such as 1.0. Gradients with respect to the <i>input</i> power saliency maps (which pixels or tokens mattered) and adversarial examples (nudging an image along the gradient sign to fool a classifier).</p>
      <p><b>Working with AI assistants.</b> Ask the assistant to state the shape of every gradient alongside its formula; a gradient whose shape differs from its parameter is always a bug. For any hand-written gradient, keep a numeric gradient test with random inputs in float64. When an assistant suggests "just normalise the gradient", check whether that silently changes the effective learning rate.</p>`,
    problems: [
      PR('grad2', {
        title: 'Gradient of a Two-Variable Quadratic', level: 'Easy', tags: ['partial derivatives', 'gradient'], companies: ['Google', 'NVIDIA'],
        statement: `<p>The function is <code>f(x, y) = a·x² + b·x·y + c·y² + d·x + e·y</code>, given as <code>coeffs = [a, b, c, d, e]</code>. Write <code>quadratic_gradient(coeffs, x, y)</code> returning <code>[∂f/∂x, ∂f/∂y]</code> at the point (x, y).</p>`,
        constraints: `<p>All numbers are floats with |value| ≤ 100. Compared with a small tolerance.</p>`,
        example: `<p><code>coeffs = [1, 0, 3, 0, 0]</code>, point (1, 1) → <code class="c-g">[2, 6]</code>. Why: f = x² + 3y², ∂f/∂x = 2x = 2, ∂f/∂y = 6y = 6.</p>
          <p><code>coeffs = [0, 1, 0, 0, 0]</code>, point (2, 5) → <code class="c-y">[5, 2]</code>: for f = xy, ∂f/∂x = y and ∂f/∂y = x.</p>`,
        bruteWhy: `<p>The numeric approach nudges x and then y by ±h and measures the change (4 evaluations of f). It is a great test, but the answer is approximate, and for n variables it costs 2n evaluations. Differentiating each term by hand gives exact formulas.</p>`,
        mcq: { q: `What is ∂/∂x of the term <code>b·x·y</code>?`, options: ['b·y', 'b·x', 'b·x·y', 'b'], answer: 0, explain: `Treat y as a constant: b·y is just a number multiplying x, and the derivative of (number)·x is that number.` },
        hints: [
          `Hint 1: Differentiate term by term, freezing the other variable. Which terms even contain x?`,
          `Hint 2: ∂/∂x: a·x² → 2ax, b·xy → by, d·x → d; c·y² and e·y are constants (0). Do the same for y.`,
          `Hint 3: Recipe: unpack a, b, c, d, e = coeffs; return [2*a*x + b*y + d, b*x + 2*c*y + e]. Test at the minimum of (x−1)² + (y−2)², where the gradient must be [0, 0].`
        ],
        approach: `<p>Apply the power rule to each term while treating the other variable as a fixed number. ∂f/∂x = 2ax + by + d and ∂f/∂y = bx + 2cy + e. The cross term bxy contributes to both partials.</p>`,
        dry: { head: ['term', '∂/∂x', '∂/∂y'], rows: [['a·x²', '2ax', '0'], ['b·x·y', 'by', 'bx'], ['c·y²', '0', '2cy'], ['d·x + e·y', 'd', 'e']] },
        complexity: `<p>O(1): a fixed number of multiplications.</p>`,
        followUps: ['Where is the gradient zero? Solve the 2×2 linear system (links back to linear algebra).', 'Write the Hessian of this function. Why does it not depend on (x, y)?']
      })
    ]
  });

  // ===================== TOPIC 4: GRADIENT DESCENT AND LEARNING RATES =====================
  topics.push({
    title: 'Gradient Descent, Learning Rates and Mini-Batches',
    analogy: `<p>Back on the foggy hill. You feel the slope, take a step downhill, feel again, step again. The <b>size of each step</b> is the learning rate. Baby steps: you will reach the valley, but at nightfall. Giant leaps: you jump clean over the valley and land higher on the other side, and the next leap is even worse. The skill is choosing a stride that is big enough to make progress and small enough to stay on the mountain.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <b>Gradient descent</b> repeats one line until the loss stops improving:</p>
      <p style="text-align:center"><b>w ← w − lr × ∇L(w)</b></p>
      <p>"Feel the slope (gradient), step the other way, scaled by the <b>learning rate</b> lr." It works for one weight or a billion.</p>
      <h4>1. Worked example: f(x) = (x − 3)², start at x = 0</h4>
      <p>The slope is f′(x) = 2(x − 3). With lr = 0.1:</p>
      ${H.table(['step', 'x', 'slope 2(x − 3)', 'x − 0.1·slope', 'f(x)'], [['0', '0', '−6', '0.6', '9'], ['1', '0.6', '−4.8', '1.08', '5.76'], ['2', '1.08', '−3.84', '1.464', '3.69'], ['3', '1.464', '−3.072', '1.771', '2.36'], ['…', '…', '…', '…', '…'], ['10', '2.678', '−0.644', '', '<span class="c-g">0.104</span>']])}
      <p>Notice the steps get smaller on their own: near the bottom the slope is small, so lr × slope is small. No need to shrink lr by hand for this simple bowl.</p>
      <h4>2. The learning rate decides everything</h4>
      <p>Each step multiplies the distance to the answer (x − 3) by <code>(1 − 2·lr)</code>. So:</p>
      ${H.table(['lr', 'factor 1 − 2·lr', 'what happens'], [
        ['0.01', '0.98', '<span class="c-y">crawls</span>: 2% closer per step, ~340 steps to get within 0.003'],
        ['0.1', '0.8', '<span class="c-g">smooth convergence</span>'],
        ['0.5', '0', '<span class="c-b">exact answer in one step</span> (only for a perfect bowl)'],
        ['0.9', '−0.8', 'overshoots, <span class="c-y">zig-zags</span> across the bottom, still converges'],
        ['1.0', '−1', 'bounces between 0 and 6 forever'],
        ['1.1', '−1.2', '<span class="c-r">diverges</span>: each bounce is 20% bigger']
      ])}
      <p><b>Rule for a quadratic:</b> for f(x) = a(x − c)², the curvature is f″ = 2a and gradient descent converges exactly when <code>0 &lt; lr &lt; 2 / f″ = 1/a</code>. With many weights, the steepest direction (largest Hessian eigenvalue λ<sub>max</sub>) sets the limit: lr &lt; 2/λ<sub>max</sub>. But the flattest direction (λ<sub>min</sub>) sets the speed, so a long, narrow valley (large λ<sub>max</sub>/λ<sub>min</sub>) is slow. Momentum and Adam help with exactly that.</p>
      <h4>3. Full-batch, stochastic and mini-batch</h4>
      ${H.table(['variant', 'gradient computed on', 'pros', 'cons'], [
        ['batch GD', 'all N examples', 'exact, smooth path', 'one step costs a full pass over the data'],
        ['SGD', '1 random example', 'very cheap steps, noise helps escape saddles', 'very noisy path'],
        ['mini-batch SGD', 'B examples (32 to millions of tokens)', 'GPU-friendly, noise is moderate', 'one more knob (B)']
      ])}
      <p>The mini-batch gradient is an unbiased <i>estimate</i> of the full gradient: right on average, noisy each time. Its noise shrinks like 1/√B. One <b>epoch</b> = one pass over the whole dataset. Modern deep learning is mini-batch SGD (with momentum or Adam on top).</p>
      <h4>4. When to stop</h4>
      <p>Stop after a fixed budget of steps, when the loss improvement falls below a tolerance, when the gradient norm is tiny, or (most common) when the <b>validation loss</b> stops improving: early stopping, covered in the last topic.</p>`,
    clues: [
      '"the loss explodes / becomes NaN" → learning rate too high (or bad data / no gradient clipping)',
      '"the loss decreases very slowly" → learning rate too low, or a badly conditioned (stretched) loss surface',
      '"the loss oscillates up and down" → lr near the stability edge; lower it or add momentum',
      '"for f = a(x − c)², which lr converges" → 0 &lt; lr &lt; 1/a (lr &lt; 2/curvature)',
      '"dataset does not fit in memory", "billions of examples" → mini-batch SGD',
      '"effect of batch size" → bigger batch = less noise per step; often scale lr up with it'
    ],
    code: [
      { lang: 'python', title: 'Gradient descent on (x − 3)² with six learning rates (runnable)', run: true, code: `def grad(x):
    return 2 * (x - 3)          # slope of f(x) = (x - 3)^2

def run(lr, steps=50, x=0.0):
    path = [x]
    for _ in range(steps):
        x = x - lr * grad(x)    # the gradient descent update
        path.append(x)
    return path

for lr in [0.01, 0.1, 0.5, 0.9, 1.0, 1.1]:
    p = run(lr)
    first = ", ".join(f"{v:.2f}" for v in p[:6])
    end = abs(p[-1] - 3)
    if end < 1e-3:
        verdict = "converged"
    elif end < abs(p[0] - 3):
        verdict = "slow progress"
    elif abs(end - 3) < 1e-9:
        verdict = "stuck bouncing"
    else:
        verdict = "DIVERGED"
    print(f"lr={lr:<4}  x: {first} ...  after 50 steps |x-3|={end:.3g}  -> {verdict}")

# the stability rule: distance to 3 is multiplied by (1 - 2*lr) each step
for lr in [0.01, 0.1, 0.5, 0.9, 1.0, 1.1]:
    print(f"lr={lr:<4}  factor = {1 - 2 * lr:+.2f}  converges: {abs(1 - 2 * lr) < 1}")
` },
      { lang: 'python', title: 'Mini-batch SGD vs full batch on a tiny dataset (runnable)', run: true, code: `import random
random.seed(0)

# data from y = 2x + 1 plus a little noise
xs = [i / 10 for i in range(100)]
ys = [2 * x + 1 + random.gauss(0, 0.1) for x in xs]

def grads(w, b, idx):
    # gradient of the mean squared error over the examples in idx
    n = len(idx)
    dw = sum(2 * ((w * xs[i] + b) - ys[i]) * xs[i] for i in idx) / n
    db = sum(2 * ((w * xs[i] + b) - ys[i]) for i in idx) / n
    return dw, db

for name, B in [("full batch", 100), ("mini-batch 10", 10), ("SGD (B=1)", 1)]:
    w = b = 0.0
    lr = 0.01
    updates = 0
    for epoch in range(30):
        order = list(range(100))
        random.shuffle(order)                      # new order every epoch
        for start in range(0, 100, B):
            dw, db = grads(w, b, order[start:start + B])
            w, b = w - lr * dw, b - lr * db
            updates += 1
    print(f"{name:14s} updates={updates:5d}  w={w:.3f}  b={b:.3f}")
print("true line: w=2, b=1. In the same 30 epochs, more (cheaper, noisier) steps get much closer.")
` },
      { lang: 'python', title: 'The PyTorch training loop (shown, not run here)', code: `import torch

model = torch.nn.Linear(1, 1)
opt = torch.optim.SGD(model.parameters(), lr=0.01)
loss_fn = torch.nn.MSELoss()
X = torch.linspace(0, 10, 100).unsqueeze(1)
y = 2 * X + 1
loader = torch.utils.data.DataLoader(torch.utils.data.TensorDataset(X, y), batch_size=10, shuffle=True)

for epoch in range(30):
    for xb, yb in loader:
        opt.zero_grad()                 # clear old gradients (they accumulate)
        loss = loss_fn(model(xb), yb)   # forward pass
        loss.backward()                 # gradients via the chain rule
        opt.step()                      # w <- w - lr * grad
print(model.weight.item(), model.bias.item())
` }
    ],
    codeTitle: ['Learning rates', 'Mini-batch SGD', 'PyTorch loop'],
    viz: {
      title: 'Gradient descent on f(x) = (x − 3)², step by step',
      input: '0.1 | 0 | 10',
      inputLabel: 'learning rate | start x | steps (≤ 25)',
      gen: function (input) {
        var p = splitBar(input, 3, '0.1 | 0 | 10');
        var lr = Number(p[0]), x = Number(p[1]), n = Math.round(Number(p[2]));
        if (!isFinite(lr) || lr <= 0 || lr > 2) throw new Error('Learning rate must be between 0 and 2, e.g. 0.1');
        if (!isFinite(x) || Math.abs(x) > 10) throw new Error('Start x must be between -10 and 10');
        if (!isFinite(n) || n < 3 || n > 25) throw new Error('Steps must be between 3 and 25');
        var F = [], rows = [], dist = [Math.abs(x - 3)], f = function (t) { return (t - 3) * (t - 3); };
        var factor = 1 - 2 * lr;
        F.push({ narr: 'We want the bottom of <b>f(x) = (x − 3)²</b>, which is at x = 3. Start at x = ' + x + ' with learning rate <b>' + lr + '</b>. Each step: slope = 2(x − 3), then x ← x − lr × slope.', parts: [
          curve('f(x): the valley we are walking down', [0, 1, 2, 3, 4, 5, 6], f, 3, 'sel'),
          { type: 'vars', vals: { x: x, 'f(x)': r4(f(x)), lr: lr, 'distance to 3': r4(Math.abs(x - 3)) }, hl: { x: 'cur' } }] });
        for (var i = 0; i < n; i++) {
          var g = 2 * (x - 3), nx = x - lr * g;
          rows.push([i + 1, r4(x), r4(g), r4(-lr * g), r4(nx), r4(f(nx))]);
          var d = Math.abs(nx - 3);
          var note = d < 1e-9 ? 'Landed exactly on the minimum.' : d < dist[dist.length - 1] ? (Math.sign(nx - 3) !== Math.sign(x - 3) && x !== 3 ? 'Overshot past 3, but ended closer: a zig-zag that still converges.' : 'Closer to 3. The step shrinks because the slope shrinks.') : d > dist[dist.length - 1] + 1e-12 ? '<span class="c-r">Further from 3 than before: the step was too big.</span>' : 'Same distance as before: bouncing back and forth.';
          x = nx; dist.push(r4(d));
          if (Math.abs(x) > 1e6) { F.push({ narr: 'x has blown past a million: <b>diverged</b>. Stop and lower the learning rate.', parts: [{ type: 'vars', vals: { x: r3(x) }, hl: { x: 'bad' } }] }); break; }
          var hlr = {}; hlr[rows.length - 1] = 'cur';
          var hb = {}; hb[dist.length - 1] = d < dist[dist.length - 2] ? 'ok' : 'bad';
          F.push({ narr: 'Step ' + (i + 1) + ': slope = 2(' + rows[i][1] + ' − 3) = ' + rows[i][2] + ', move by −' + lr + ' × ' + rows[i][2] + ' = ' + rows[i][3] + ', new x = <b>' + r4(x) + '</b>. ' + note, parts: [
            { type: 'table', label: 'steps so far', columns: ['step', 'x', 'slope', 'move', 'new x', 'f(new x)'], rows: rows.slice(-6).map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[Math.min(rows.length, 6) - 1] = 'cur'; return o; })() },
            { type: 'bars', label: 'distance |x − 3| after each step', values: dist.slice(), hl: hb }] });
        }
        var verdict = Math.abs(factor) < 1 ? (Math.abs(factor) < 0.5 ? 'converges fast' : factor < 0 ? 'converges, zig-zagging' : 'converges, slowly') : Math.abs(factor) === 1 ? 'bounces forever' : 'diverges';
        F.push({ narr: 'Why: every step multiplies the distance to 3 by <b>1 − 2·lr = ' + r4(factor) + '</b>. |factor| &lt; 1 shrinks it, |factor| &gt; 1 grows it. So this run <b>' + verdict + '</b>. Safe range for this bowl: 0 &lt; lr &lt; 1; best: lr = 0.5.', parts: [
          { type: 'table', label: 'the rule for f(x) = (x − 3)²', columns: ['lr', 'factor', 'behaviour'], rows: [['0.01', '0.98', 'slow'], ['0.1', '0.8', 'smooth'], ['0.5', '0', 'one step'], ['0.9', '−0.8', 'zig-zag, converges'], ['1.0', '−1', 'bounces'], ['1.1', '−1.2', 'diverges'], [String(lr), String(r4(factor)), verdict]], hl: { 6: Math.abs(factor) < 1 ? 'ok' : 'bad' } }] });
        return F;
      }
    },
    examples: [
      { title: 'Two weights, one learning rate', html: `<p>Minimise <code>f(x, y) = x² + 10y²</code> from (10, 1). Gradient [2x, 20y]. Curvatures are 2 and 20, so stability needs lr &lt; 2/20 = <b>0.1</b>. With lr = 0.09, y's factor is 1 − 0.09·20 = −0.8 (zig-zag), x's is 1 − 0.18 = 0.82 (slow). The steep direction limits the step; the flat direction makes you wait. Ratio 20/2 = 10 is the condition number.</p>`, code: { lang: 'python', run: true, code: `x, y, lr = 10.0, 1.0, 0.09
for step in range(1, 41):
    x, y = x - lr * 2 * x, y - lr * 20 * y
    if step % 8 == 0:
        print(f"step {step:2d}: x={x:8.4f}  y={y:8.4f}  f={x * x + 10 * y * y:.4f}")
` } },
      { title: 'Choosing a learning rate that converges', html: `<p>Loss <code>L(w) = 4(w − 1)²</code>. Curvature L″ = 8, so lr must be below 2/8 = <b>0.25</b>. The fastest choice is lr = 1/8 = 0.125: factor 1 − 8·0.125 = 0, one step to the answer. In practice you do not know the curvature, so you try lr on a log scale (1e-1, 3e-2, 1e-2, …) and keep the largest one whose loss falls smoothly.</p>` },
      { title: 'Counting epochs and steps', html: `<p>1,000,000 examples, batch size 250 → <b>4,000 steps per epoch</b>. 3 epochs = 12,000 updates. With full-batch GD, 3 epochs would be just 3 updates. That is why mini-batches make far more progress per unit of compute on big datasets.</p>` },
      { title: 'Spotting divergence early', html: `<p>Loss log: 2.31, 2.10, 1.95, 2.40, 4.8, 37.2, nan. The jump after step 3 is the warning. Fixes in order: lower lr (÷3 or ÷10), add learning-rate warm-up, clip the gradient norm, check the data for huge values or bad labels.</p>` }
    ],
    deepDive: `<p><b>🟣 The convergence proof for a bowl.</b> Near a minimum, a smooth loss looks like a quadratic ½(w − w*)ᵀH(w − w*). Gradient descent then gives w<sub>t+1</sub> − w* = (I − lr·H)(w<sub>t</sub> − w*). In the eigenvector directions of H this is n separate 1-D problems (one per eigenvector) with factors 1 − lr·λ<sub>i</sub>. All |1 − lr·λ<sub>i</sub>| &lt; 1 ⇔ lr &lt; 2/λ<sub>max</sub>. The best fixed lr, 2/(λ<sub>max</sub> + λ<sub>min</sub>), still gives a slowest factor of (κ − 1)/(κ + 1) with κ = λ<sub>max</sub>/λ<sub>min</sub>, so the number of steps grows roughly like κ. Momentum improves this to about √κ.</p>
      <p><b>"Edge of stability".</b> Research on neural networks found that with a fixed lr, training often drives the sharpness (λ<sub>max</sub>) up until it hovers right at 2/lr, with the loss still decreasing non-monotonically. So real training lives near the boundary this simple analysis predicts.</p>
      <p><b>Batch size and noise.</b> The mini-batch gradient's variance is about σ²/B. Doubling B halves the noise, so a common heuristic scales lr linearly with B (with warm-up), up to a "critical batch size" beyond which bigger batches stop helping. Some noise is good: it helps escape saddle points and sharp minima, which tend to generalise worse.</p>
      <p><b>Line search and second-order methods.</b> Classical optimisation picks the step size per iteration (backtracking line search) or uses curvature (Newton's method, L-BFGS). These shine on small, smooth, full-batch problems (logistic regression in scikit-learn uses L-BFGS by default) but are rarely used for deep networks, where noisy mini-batches and huge parameter counts favour first-order methods.</p>`,
    aiEra: `<p><b>🤖 Where you meet this in AI work.</b> The learning rate is the first hyperparameter everyone tunes. Fine-tuning recipes specify it carefully (often around 1e-5 to 2e-4 for LLM fine-tuning, larger for LoRA adapters than for full fine-tuning), pair it with warm-up and decay, and scale it with batch size. Loss curves that spike or go to NaN are almost always investigated by lowering lr or adding clipping first.</p>
      <p><b>Working with AI assistants.</b> Assistants will happily suggest "try lr = 1e-3", which is a fine default for Adam but often too high for SGD on some problems and too high for fine-tuning a pretrained model. Ask for a short learning-rate sweep on a log scale with a fixed small budget, and plot the loss curves; let the data choose. Also check that the assistant's loop calls <code>zero_grad()</code>, shuffles each epoch, and averages (not sums) the loss over the batch, since a sum silently multiplies the effective lr by B.</p>`,
    problems: [
      PR('gd', {
        title: 'Run n Steps of Gradient Descent', level: 'Easy', tags: ['gradient descent', 'learning rate'], companies: ['Amazon', 'Google'],
        statement: `<p>Minimise <code>f(x) = a·(x − c)²</code> with plain gradient descent. Write <code>gradient_descent(a, c, x0, lr, n)</code> that starts at x0, performs exactly n updates <code>x ← x − lr·f′(x)</code>, and returns the final x.</p>`,
        constraints: `<p>a &gt; 0, |c|, |x0| ≤ 100, 0 &lt; lr ≤ 2, 0 ≤ n ≤ 10<sup>5</sup>. Compared with a small tolerance (diverging runs are kept short).</p>`,
        example: `<p><code>a = 1, c = 3, x0 = 0, lr = 0.1, n = 1</code> → <code class="c-g">0.6</code>. Why: f′(0) = 2·1·(0 − 3) = −6, so x = 0 − 0.1·(−6) = 0.6.</p>
          <p>With lr = 0.5 and n = 1 the answer is exactly <code class="c-b">3.0</code>: factor 1 − 2·a·lr = 0.</p>`,
        bruteWhy: `<p>There is no slow version of a loop this simple. The common mistake is using the wrong slope: forgetting the 2 or the a in f′(x) = 2a(x − c), or adding the gradient instead of subtracting it, which walks uphill.</p>`,
        mcq: { q: `For f(x) = 2(x − 5)², which learning rate makes gradient descent diverge?`, options: ['0.6', '0.25', '0.1', '0.4'], answer: 0, explain: `The factor is 1 − 2·a·lr = 1 − 4·lr. For lr = 0.6 it is −1.4: |−1.4| &gt; 1, so it diverges. The safe range is 0 &lt; lr &lt; 0.5.` },
        hints: [
          `Hint 1: The slope of a(x − c)² is 2a(x − c). The minus sign in the update makes you go downhill.`,
          `Hint 2: A simple for-loop of n iterations, updating x in place.`,
          `Hint 3: n = 0 returns x0 unchanged. Recipe: x = x0; repeat n times: x -= lr * 2 * a * (x - c); return x.`
        ],
        approach: `<p>Loop n times applying x ← x − lr·2a(x − c). Equivalently, the closed form is x<sub>n</sub> = c + (x0 − c)(1 − 2a·lr)<sup>n</sup>, which also shows when it converges (|1 − 2a·lr| &lt; 1).</p>`,
        dry: { head: ['step', 'x', 'f′(x)', 'new x (lr = 0.1)'], rows: [['1', '0', '−6', '0.6'], ['2', '0.6', '−4.8', '1.08'], ['3', '1.08', '−3.84', '1.464']] },
        complexity: `<p>O(n) time, O(1) space. The closed form gives O(log n) via fast exponentiation, but the loop is what generalises to real models.</p>`,
        followUps: ['Use the closed form to compute how many steps it takes to get within 10⁻⁶ of c.', 'What learning rate minimises the number of steps for this function?']
      })
    ]
  });

  // ===================== TOPIC 5: LOSS FUNCTIONS =====================
  topics.push({
    title: 'Loss Functions: MSE, Cross-Entropy and Their Gradients',
    analogy: `<p>A darts coach scores your throws. One coach measures <b>how far</b> each dart landed from the bullseye and squares it, so wild throws are punished hard (that is <b>MSE</b>). Another coach, for a yes/no quiz, asks <b>how confident</b> you were in the right answer: saying "99% sure" and being wrong costs you enormously, saying "60% sure" and being wrong costs a little (that is <b>cross-entropy</b>). The loss function is the coach. Training is you trying to please that coach, so choosing the right coach decides what the model learns.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A <b>loss function</b> turns "how wrong is the model?" into one number. Gradient descent then needs its gradient. Two losses cover most of ML: <b>mean squared error</b> for numbers and <b>cross-entropy</b> for categories.</p>
      <h4>1. Mean squared error (regression)</h4>
      <p><code>MSE = (1/n) × Σ (ŷᵢ − yᵢ)²</code>. Predictions [2.5, 0, 2] vs truth [3, −0.5, 2]: errors −0.5, 0.5, 0; squares 0.25, 0.25, 0; MSE = 0.5/3 ≈ <b>0.167</b>.</p>
      <p>For a line ŷ = w·x + b, the chain rule gives <code>∂MSE/∂w = (2/n)Σ(ŷᵢ − yᵢ)·xᵢ</code> and <code>∂MSE/∂b = (2/n)Σ(ŷᵢ − yᵢ)</code>: "average error, weighted by the input".</p>
      ${H.table(['x', 'y', 'ŷ = 1·x + 1', 'error ŷ − y', '2·err·x', '2·err'], [['1', '2', '2', '0', '0', '0'], ['2', '4', '3', '−1', '−4', '−2'], ['3', '6', '4', '−2', '−12', '−4'], ['mean', '', '', 'MSE = (0+1+4)/3 = 1.667', '∂w = −5.333', '∂b = −2']])}
      <p>Both partials are negative: increase w and b. (The true line here is y = 2x.)</p>
      <h4>2. Binary cross-entropy (yes/no classification)</h4>
      <p>The model outputs a probability p = σ(z) that the label is 1. The loss is <code>BCE = −[y·ln p + (1 − y)·ln(1 − p)]</code>. Only one term is ever active: if y = 1 the loss is −ln p, if y = 0 it is −ln(1 − p).</p>
      ${H.table(['true y', 'predicted p', 'loss', 'verdict'], [['1', '0.9', '−ln 0.9 = 0.105', '<span class="c-g">confident and right: tiny loss</span>'], ['1', '0.5', '−ln 0.5 = 0.693', 'unsure: medium loss'], ['1', '0.1', '−ln 0.1 = 2.303', '<span class="c-r">confident and wrong: big loss</span>'], ['1', '0.001', '6.908', '<span class="c-r">grows without limit as p → 0</span>']])}
      <p><b>The magic gradient.</b> Combine sigmoid and BCE and the chain rule collapses beautifully: <code>∂BCE/∂z = p − y</code>. Predicted 0.1, truth 1: gradient −0.9. Simple, and never tiny when the model is badly wrong.</p>
      <h4>3. Softmax + cross-entropy (many classes)</h4>
      <p>Raw scores (logits) z become probabilities with <b>softmax</b>: pᵢ = e<sup>zᵢ</sup> / Σⱼ e<sup>zⱼ</sup>. The loss is <code>−ln p<sub>target</sub></code>. Logits [2, 1, 0.1], target class 0: e² = 7.389, e¹ = 2.718, e<sup>0.1</sup> = 1.105, sum 11.212; p = [0.659, 0.242, 0.099]; loss = −ln 0.659 = <b>0.417</b>.</p>
      <p>Gradient with respect to each logit: <b>p − one_hot(target)</b> = [0.659 − 1, 0.242, 0.099] = [−0.341, 0.242, 0.099]. Push the correct score up, the others down, in proportion to how much probability they stole. An LLM's training loss is exactly this, with one class per vocabulary token.</p>
      <h4>4. Why not MSE for classification?</h4>
      <p>With a sigmoid output, MSE's gradient with respect to z is 2(p − y)·p(1 − p). When the model is confidently wrong (p ≈ 0.01, y = 1) that is 2·(−0.99)·0.0099 ≈ <span class="c-r">−0.02</span>: almost no learning signal exactly when it is needed most. Cross-entropy gives −0.99. Cross-entropy is also the <b>negative log-likelihood</b> of the data (see the probability module), so minimising it is maximum-likelihood estimation.</p>`,
    clues: [
      '"predict a number (price, temperature)" → MSE (or MAE / Huber if outliers matter)',
      '"predict yes/no, probability of class 1" → sigmoid + binary cross-entropy (BCEWithLogitsLoss)',
      '"one of K classes", "next-token prediction" → softmax + cross-entropy; gradient = p − one_hot',
      '"log loss", "negative log-likelihood", "perplexity" → cross-entropy (perplexity = e<sup>loss</sup>)',
      '"loss is NaN / inf with log" → clip probabilities or compute from logits (log-sum-exp trick)',
      '"MSE with sigmoid trains slowly" → saturated sigmoid shrinks the gradient; switch to cross-entropy'
    ],
    code: [
      { lang: 'python', title: 'Linear regression by gradient descent on MSE (runnable)', run: true, code: `# Data roughly on the line y = 3x + 2
xs = [0, 1, 2, 3, 4, 5]
ys = [2.1, 4.9, 8.2, 10.9, 14.1, 17.0]
n = len(xs)

w, b, lr = 0.0, 0.0, 0.03
for epoch in range(2001):
    preds = [w * x + b for x in xs]
    errs = [p - y for p, y in zip(preds, ys)]
    mse = sum(e * e for e in errs) / n
    dw = sum(2 * e * x for e, x in zip(errs, xs)) / n     # dMSE/dw
    db = sum(2 * e for e in errs) / n                     # dMSE/db
    w, b = w - lr * dw, b - lr * db
    if epoch in (0, 1, 10, 100, 500, 2000):
        print(f"epoch {epoch:4d}  MSE={mse:8.4f}  w={w:.4f}  b={b:.4f}")

# compare with the exact least-squares answer (normal equations)
mx, my = sum(xs) / n, sum(ys) / n
w_star = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
print(f"closed form: w={w_star:.4f}  b={my - w_star * mx:.4f}")
` },
      { lang: 'python', title: 'Logistic regression with binary cross-entropy (runnable)', run: true, code: `import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z)) if z >= 0 else math.exp(z) / (1 + math.exp(z))

# hours studied -> passed the exam (1) or not (0)
X = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]
Y = [0,   0,   0,   0,   1,   0,   1,   1,   1,   1]
n = len(X)

w, b, lr = 0.0, 0.0, 0.5
for epoch in range(3001):
    ps = [sigmoid(w * x + b) for x in X]
    # mean binary cross-entropy (clip so log never sees exactly 0)
    loss = -sum(y * math.log(max(p, 1e-12)) + (1 - y) * math.log(max(1 - p, 1e-12)) for p, y in zip(ps, Y)) / n
    # the famous simple gradient: dLoss/dz = p - y
    dw = sum((p - y) * x for p, y, x in zip(ps, Y, X)) / n
    db = sum(p - y for p, y in zip(ps, Y)) / n
    w, b = w - lr * dw, b - lr * db
    if epoch in (0, 10, 100, 1000, 3000):
        print(f"epoch {epoch:4d}  BCE={loss:.4f}  w={w:.3f}  b={b:.3f}")

print("decision boundary (p = 0.5) at x =", round(-b / w, 3), "hours")
for hours in [1, 2.75, 4]:
    print(f"P(pass | {hours} h) = {sigmoid(w * hours + b):.3f}")
` },
      { lang: 'python', title: 'Softmax cross-entropy and its gradient, with a numeric check (runnable)', run: true, code: `import math

def softmax(z):
    m = max(z)                                  # subtract the max: exp never overflows
    e = [math.exp(v - m) for v in z]
    s = sum(e)
    return [v / s for v in e]

def ce_loss(z, target):
    # -log softmax(z)[target], computed stably with log-sum-exp
    m = max(z)
    return -(z[target] - m - math.log(sum(math.exp(v - m) for v in z)))

z, t = [2.0, 1.0, 0.1], 0
p = softmax(z)
print("probs:", [round(v, 4) for v in p], " loss:", round(ce_loss(z, t), 4))
grad = [pi - (1 if i == t else 0) for i, pi in enumerate(p)]
print("analytic grad p - one_hot:", [round(g, 4) for g in grad])

h = 1e-5
num = []
for i in range(len(z)):
    up = z[:]; up[i] += h
    dn = z[:]; dn[i] -= h
    num.append((ce_loss(up, t) - ce_loss(dn, t)) / (2 * h))
print("numeric grad            :", [round(g, 4) for g in num])
print("huge logits are safe    :", abs(round(ce_loss([1000.0, 0.0], 0), 6)), round(ce_loss([0.0, 1000.0], 0), 1))
` },
      { lang: 'python', title: 'The PyTorch losses (shown, not run here)', code: `import torch
import torch.nn.functional as F

# regression
pred, target = torch.tensor([2.5, 0.0, 2.0]), torch.tensor([3.0, -0.5, 2.0])
print(F.mse_loss(pred, target))                      # 0.1667

# binary: pass LOGITS, not probabilities; the sigmoid is fused in for stability
logits, labels = torch.tensor([2.0, -1.0]), torch.tensor([1.0, 0.0])
print(F.binary_cross_entropy_with_logits(logits, labels))

# multi-class: logits of shape (batch, classes), integer class targets
z = torch.tensor([[2.0, 1.0, 0.1]], requires_grad=True)
loss = F.cross_entropy(z, torch.tensor([0]))         # softmax + log + pick target, in one stable op
loss.backward()
print(loss.item(), z.grad)                           # 0.417, [[-0.341, 0.242, 0.099]]
` }
    ],
    codeTitle: ['Linear regression', 'Logistic regression', 'Softmax CE', 'PyTorch'],
    viz: {
      title: 'MSE vs cross-entropy: how hard does each loss push?',
      input: '1 | 0.99 0.9 0.6 0.4 0.1 0.01',
      inputLabel: 'true label y (0 or 1) | predicted probabilities p',
      gen: function (input) {
        var p = splitBar(input, 2, '1 | 0.99 0.9 0.6 0.4 0.1 0.01');
        var y = Number(p[0]), ps = nums(p[1], 'the probabilities', 8);
        if (y !== 0 && y !== 1) throw new Error('The true label must be 0 or 1');
        if (ps.some(function (v) { return v <= 0 || v >= 1; })) throw new Error('Probabilities must be strictly between 0 and 1');
        if (ps.length < 3) throw new Error('Give at least 3 probabilities');
        var F = [], rows = [], ce = [], ms = [], gce = [], gms = [];
        F.push({ narr: 'The true label is <b>y = ' + y + '</b>. The model outputs p = σ(z), its probability for class 1. We compare two coaches: <b>MSE</b> (p − y)² and <b>cross-entropy</b> −[y·ln p + (1 − y)·ln(1 − p)]. The key question for learning is the gradient with respect to the logit z.', parts: [
          { type: 'table', label: 'formulas', columns: ['loss', 'value', 'gradient w.r.t. z'], rows: [['MSE', '(p − y)²', '2(p − y)·p(1 − p)'], ['cross-entropy', '−ln p if y=1, −ln(1−p) if y=0', 'p − y']] }] });
        ps.forEach(function (q, i) {
          var c = -(y * Math.log(q) + (1 - y) * Math.log(1 - q)), m = (q - y) * (q - y), gc = q - y, gm = 2 * (q - y) * q * (1 - q);
          ce.push(r3(c)); ms.push(r3(m)); gce.push(r3(gc)); gms.push(r4(gm));
          rows.push([q, r4(m), r4(c), r4(gm), r4(gc)]);
          var wrong = Math.abs(q - y) > 0.5;
          var hl = {}; hl[i] = wrong ? 'bad' : 'ok';
          F.push({ narr: 'Prediction <b>p = ' + q + '</b>: ' + (wrong ? '<span class="c-r">wrong side</span>' : '<span class="c-g">right side</span>') + '. MSE = ' + r4(m) + ', cross-entropy = ' + r4(c) + '. Gradient on z: MSE ' + r4(gm) + ' vs CE ' + r4(gc) + '. ' + (wrong && Math.abs(gm) < Math.abs(gc) / 3 ? 'The sigmoid is saturated, so MSE barely pushes even though the answer is badly wrong.' : 'Both push in the same direction.'), parts: [
            { type: 'table', label: 'loss and push for each prediction', columns: ['p', 'MSE', 'CE', 'MSE grad on z', 'CE grad on z'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[i] = wrong ? 'bad' : 'cur'; return o; })() },
            { type: 'bars', label: 'cross-entropy loss', values: ce.slice(), hl: hl, idxLabels: ps.slice(0, i + 1).map(String) }] });
        });
        var hl2 = {};
        ps.forEach(function (q, i) { if (Math.abs(q - y) > 0.5) hl2[i] = 'bad'; });
        F.push({ narr: 'Side by side, the <b>size of the push</b> (|gradient on z|). Cross-entropy pushes hardest exactly when the model is most wrong; MSE through a sigmoid goes quiet at both ends. That is why classifiers use cross-entropy.', parts: [
          { type: 'bars', label: '|CE gradient|', values: gce.map(function (v) { return r3(Math.abs(v)); }), idxLabels: ps.map(String), hl: hl2 },
          { type: 'bars', label: '|MSE gradient|', values: gms.map(function (v) { return r3(Math.abs(v)); }), idxLabels: ps.map(String), hl: hl2 }] });
        return F;
      }
    },
    examples: [
      { title: 'MSE by hand, and why squaring matters', html: `<p>Errors [1, −1, 1, −1] give MSE 1; errors [0, 0, 0, 4] give MSE 16/4 = 4, even though both have total absolute error 4. MSE punishes one big miss far more than many small ones. If your data has outliers you do not trust, the mean absolute error (MAE) or the Huber loss (squared near 0, linear far away) is gentler.</p>` },
      { title: 'Binary cross-entropy over a batch', html: `<p>Labels [1, 0, 1], predictions [0.8, 0.2, 0.6]. Losses: −ln 0.8 = 0.223, −ln 0.8 = 0.223 (for y = 0 we use 1 − p = 0.8), −ln 0.6 = 0.511. Mean <b>0.319</b>. Gradients on the logits: p − y = [−0.2, 0.2, −0.4] (divide by 3 for the mean).</p>`, code: { lang: 'python', run: true, code: `import math
y, p = [1, 0, 1], [0.8, 0.2, 0.6]
loss = -sum(t * math.log(q) + (1 - t) * math.log(1 - q) for t, q in zip(y, p)) / len(y)
print(round(loss, 4))                                   # 0.319
print([round(q - t, 2) for t, q in zip(y, p)])          # p - y per example
` } },
      { title: 'Cross-entropy and perplexity for an LLM', html: `<p>An LLM's average next-token cross-entropy is 2.0 nats. Perplexity = e<sup>2.0</sup> ≈ <b>7.4</b>: on average the model is as unsure as if it were choosing uniformly among about 7 tokens. Loss 1.5 → perplexity 4.5. A loss of ln(50,000) ≈ 10.8 is what a model guessing uniformly over a 50k vocabulary would get.</p>` },
      { title: 'The p − y gradient, derived', html: `<p>For y = 1, L = −ln p and p = σ(z). Chain rule: dL/dp = −1/p, dp/dz = p(1 − p). Product: −(1 − p) = p − 1 = <b>p − y</b>. For y = 0, L = −ln(1 − p): dL/dp = 1/(1 − p), times p(1 − p) gives p = p − y. Same formula both ways: the 1/p from the log cancels the sigmoid's slope.</p>` }
    ],
    deepDive: `<p><b>🟣 Where these losses come from.</b> If you assume the targets are the model's prediction plus Gaussian noise, maximising the likelihood of the data is the same as minimising MSE. If you assume the label is a Bernoulli (coin flip) with probability p, maximising the likelihood is minimising binary cross-entropy; with a categorical distribution you get softmax cross-entropy. So "choose the loss" really means "choose the noise model", which is why the probability module matters here.</p>
      <p><b>Numerical stability.</b> Computing σ(z) and then ln(σ(z)) fails for large |z|: σ(−800) underflows to 0 and ln 0 = −∞. Stable implementations work from the logit directly: ln σ(z) = −softplus(−z) = −ln(1 + e<sup>−z</sup>), computed with a max-shift. For softmax, log-sum-exp subtracts the max logit first: ln Σ e<sup>zᵢ</sup> = m + ln Σ e<sup>zᵢ − m</sup>. That is why PyTorch has <code>BCEWithLogitsLoss</code> and why <code>cross_entropy</code> takes logits, not probabilities.</p>
      <p><b>Convexity.</b> MSE for linear regression and cross-entropy for logistic regression are <b>convex</b> in the weights: one bowl, no bad local minima, so gradient descent with a suitable lr finds the global best. Add a hidden layer and convexity is lost, which is the topic of the final section.</p>
      <p><b>Variants you will see.</b> Label smoothing (target 0.9 instead of 1 to discourage over-confidence), class weights or focal loss (for rare classes), KL divergence (cross-entropy minus the target's own entropy, used in distillation and RLHF penalties), contrastive losses such as InfoNCE (softmax cross-entropy over "which item is the true pair"), and the DPO loss (a sigmoid cross-entropy on preference pairs).</p>`,
    aiEra: `<p><b>🤖 Where you meet this in AI work.</b> LLM pre-training and fine-tuning minimise softmax cross-entropy on the next token, usually reported as loss or perplexity. Instruction tuning masks the prompt tokens so only the answer contributes. Embedding models use contrastive cross-entropy, classifiers use BCE or CE, and reward models use a pairwise sigmoid loss. Reading a loss curve well (what value means "random guessing", what a plateau means) is a daily skill.</p>
      <p><b>Working with AI assistants.</b> Common bugs in generated code: applying softmax <i>and then</i> calling <code>cross_entropy</code> (which applies its own log-softmax, so the model is trained on the wrong thing), passing probabilities to <code>BCEWithLogitsLoss</code>, forgetting to mask padding tokens, using sum instead of mean (changes the effective learning rate) and mixing up class-index targets with one-hot targets. Ask the assistant to print the loss on a random-initialised model: for K balanced classes it should be close to ln K.</p>`,
    problems: [
      PR('mseg', {
        title: 'MSE and Its Gradient for a Line', level: 'Medium', tags: ['loss functions', 'MSE', 'linear regression'], companies: ['Amazon', 'Microsoft'],
        statement: `<p>For a linear model ŷ = w·x + b and data points (xs[i], ys[i]), write <code>mse_and_grad(xs, ys, w, b)</code> that returns <code>[MSE, ∂MSE/∂w, ∂MSE/∂b]</code>, where MSE is the mean of (ŷ − y)².</p>`,
        constraints: `<p>1 ≤ n ≤ 10<sup>5</sup>, len(xs) = len(ys), |values| ≤ 10<sup>3</sup>. Compared with a small tolerance.</p>`,
        example: `<p><code>xs = [1, 2, 3], ys = [2, 4, 6], w = 1, b = 1</code> → <code class="c-g">[1.6667, −5.3333, −2.0]</code>. Why: predictions [2, 3, 4], errors [0, −1, −2]. MSE = (0 + 1 + 4)/3. ∂w = (2/3)(0·1 + (−1)·2 + (−2)·3) = −16/3. ∂b = (2/3)(0 − 1 − 2) = −2.</p>`,
        bruteWhy: `<p>A numeric gradient would evaluate the whole MSE four times (w ± h, b ± h), each over all n points. The analytic gradient reuses one pass of errors for the loss and both partials.</p>`,
        mcq: { q: `If every prediction is too high by exactly 1 (and the x values are positive), what are the signs of ∂MSE/∂w and ∂MSE/∂b?`, options: ['both positive: decrease w and b', 'both negative', 'w positive, b negative', 'both zero'], answer: 0, explain: `Error = +1 everywhere. ∂b = 2·mean(err) = 2 &gt; 0. ∂w = 2·mean(err·x) &gt; 0 for positive x. Gradient descent subtracts them, lowering both.` },
        hints: [
          `Hint 1: Compute each error e = (w·x + b) − y once and reuse it for all three outputs.`,
          `Hint 2: d(e²)/dw = 2e·x and d(e²)/db = 2e, by the chain rule (de/dw = x, de/db = 1).`,
          `Hint 3: Accumulate loss += e², dw += 2e·x, db += 2e over the points, then divide all three by n. Return a list of three floats.`
        ],
        approach: `<p>One pass: for each point compute the error, add its square to the loss and its chain-rule contributions to the two partials. Divide by n because MSE is a mean. In matrix form this is ∇ = (2/n)·Xᵀ(Xw − y) with a column of ones for the bias.</p>`,
        dry: { head: ['x', 'y', 'ŷ', 'e', 'e²', '2e·x', '2e'], rows: [['1', '2', '2', '0', '0', '0', '0'], ['2', '4', '3', '−1', '1', '−4', '−2'], ['3', '6', '4', '−2', '4', '−12', '−4'], ['÷3', '', '', '', '1.667', '−5.333', '−2']] },
        complexity: `<p>O(n) time, O(1) extra space.</p>`,
        followUps: ['Turn this into full linear regression by gradient descent. What learning rate is safe?', 'How does the gradient change for the mean absolute error?']
      })
    ]
  });

  // ===================== TOPIC 6: BACKPROPAGATION BY HAND =====================
  topics.push({
    title: 'Backpropagation by Hand: A Two-Layer Network',
    analogy: `<p>A restaurant gets a bad review: "the soup was cold". The manager traces the blame <b>backwards</b>: the waiter carried it slowly (some blame), the chef plated it late (some blame), the supplier delivered late (a little blame). Each person's share depends on how much their part affected the final soup. <b>Backpropagation</b> is that blame-tracing for a network: the error at the output is passed back layer by layer, and every weight learns its share, so it knows which way to change.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Backpropagation is the chain rule (topic 2) applied to a whole network, organised layer by layer. Forward: compute and <b>save</b> every layer's values. Backward: start from dL/dŷ and, for each layer from last to first, compute the gradient for its weights and pass a gradient on to the layer before.</p>
      <h4>1. Our tiny network</h4>
      <p>2 inputs → 2 hidden neurons with sigmoid → 1 linear output. Loss L = ½(ŷ − y)² (the ½ makes the derivative simply ŷ − y).</p>
      ${H.table(['quantity', 'formula', 'numbers'], [['input x, target y', '', 'x = [1, 2], y = 1'], ['first layer W1, b1', '', 'W1 = [[0.1, 0.2], [−0.3, 0.4]], b1 = [0, 0]'], ['second layer w2, b2', '', 'w2 = [0.5, −0.5], b2 = 0']])}
      <h4>2. Forward pass (save everything)</h4>
      ${H.table(['step', 'formula', 'value'], [
        ['z1 = W1·x + b1', '[0.1·1 + 0.2·2, −0.3·1 + 0.4·2]', '[0.5, 0.5]'],
        ['h = σ(z1)', 'σ(0.5)', '[0.6225, 0.6225]'],
        ['ŷ = w2·h + b2', '0.5·0.6225 − 0.5·0.6225 + 0', '0'],
        ['L = ½(ŷ − y)²', '½(0 − 1)²', '<span class="c-r">0.5</span>']
      ])}
      <h4>3. Backward pass (the blame flows right to left)</h4>
      ${H.table(['gradient', 'rule', 'value'], [
        ['dL/dŷ', 'ŷ − y', '−1'],
        ['dL/dw2', 'dL/dŷ · h', '[−0.6225, −0.6225]'],
        ['dL/db2', 'dL/dŷ · 1', '−1'],
        ['dL/dh', 'dL/dŷ · w2', '[−0.5, 0.5]'],
        ['dL/dz1', 'dL/dh ⊙ h(1 − h)   (⊙ = slot by slot)', '[−0.5·0.235, 0.5·0.235] = [−0.1175, 0.1175]'],
        ['dL/dW1', 'dL/dz1 (column) × xᵀ (row)', '[[−0.1175, −0.2350], [0.1175, 0.2350]]'],
        ['dL/db1', 'dL/dz1', '[−0.1175, 0.1175]']
      ])}
      <p>Read the result: the output is too low (0 vs 1), so w2 should rise (negative gradient), neuron 1's incoming weights should rise (it helps the output) and neuron 2's should fall (it hurts, because its outgoing weight is negative). Blame is shared in exact proportion to influence.</p>
      <h4>4. The three rules for every layer</h4>
      <p>For a layer z = W·a<sub>prev</sub> + b followed by an activation, with δ = dL/dz:</p>
      <ol><li><b>Weights:</b> dL/dW = δ · a<sub>prev</sub>ᵀ (an outer product: same shape as W).</li><li><b>Bias:</b> dL/db = δ.</li><li><b>Pass back:</b> dL/da<sub>prev</sub> = Wᵀ · δ, then multiply slot by slot by the previous activation's slope to get the previous δ.</li></ol>
      <p>With a batch of examples you average these over the batch. That is the entire algorithm; deep networks just repeat it per layer.</p>
      <h4>5. Check it numerically</h4>
      <p>Nudge one weight, say W1[0][0], by ±10<sup>−5</sup>, rerun the forward pass, and compute (L<sub>+</sub> − L<sub>−</sub>) / 2·10<sup>−5</sup>. You get −0.1175, matching. Doing this for every parameter is a <b>gradient check</b>; a relative error below about 10<sup>−7</sup> (in float64) means your backward pass is right.</p>`,
    clues: [
      '"derive the gradients for a two-layer network" → forward with caching, then δ rules layer by layer',
      '"dL/dW for a linear layer" → δ · inputᵀ (outer product); "dL/dinput" → Wᵀ · δ',
      '"why is training memory-hungry" → activations saved during forward for use in backward',
      '"implement a gradient check" → central differences per parameter, compare with relative error',
      '"vanishing gradients in deep sigmoid nets" → δ is multiplied by σ′ ≤ 0.25 at every layer',
      '"why initialise weights randomly, not all zeros" → symmetric neurons get identical gradients and never differ'
    ],
    code: [
      { lang: 'python', title: 'Forward, backward and gradient check for a 2-2-1 network (runnable)', run: true, code: `import math

sig = lambda t: 1 / (1 + math.exp(-t))

x, y = [1.0, 2.0], 1.0
W1 = [[0.1, 0.2], [-0.3, 0.4]]
b1 = [0.0, 0.0]
w2 = [0.5, -0.5]
b2 = 0.0

def forward(W1, b1, w2, b2):
    z1 = [sum(W1[j][i] * x[i] for i in range(2)) + b1[j] for j in range(2)]
    h = [sig(z) for z in z1]
    y_hat = sum(w2[j] * h[j] for j in range(2)) + b2
    return z1, h, y_hat, 0.5 * (y_hat - y) ** 2

# ---------- forward (cache z1, h, y_hat) ----------
z1, h, y_hat, L = forward(W1, b1, w2, b2)
print("z1 =", [round(v, 4) for v in z1], " h =", [round(v, 4) for v in h], " y_hat =", round(y_hat, 4), " L =", round(L, 4))

# ---------- backward ----------
d_yhat = y_hat - y                                        # dL/dy_hat
d_w2 = [d_yhat * h[j] for j in range(2)]                  # output layer weights
d_b2 = d_yhat
d_h = [d_yhat * w2[j] for j in range(2)]                  # pass back: w2^T * delta
d_z1 = [d_h[j] * h[j] * (1 - h[j]) for j in range(2)]     # times the sigmoid slope
d_W1 = [[d_z1[j] * x[i] for i in range(2)] for j in range(2)]   # outer product delta * x^T
d_b1 = d_z1[:]
print("dW1 =", [[round(v, 4) for v in r] for r in d_W1], " db1 =", [round(v, 4) for v in d_b1])
print("dw2 =", [round(v, 4) for v in d_w2], " db2 =", round(d_b2, 4))

# ---------- gradient check on every parameter ----------
eps, worst = 1e-5, 0.0
def numeric(change):
    plus = change(+eps); minus = change(-eps)
    return (forward(*plus)[3] - forward(*minus)[3]) / (2 * eps)

checks = []
for j in range(2):
    for i in range(2):
        def ch(d, j=j, i=i):
            W = [r[:] for r in W1]; W[j][i] += d
            return W, b1, w2, b2
        checks.append(("W1[%d][%d]" % (j, i), d_W1[j][i], numeric(ch)))
for j in range(2):
    checks.append(("w2[%d]" % j, d_w2[j], numeric(lambda d, j=j: (W1, b1, [w2[k] + (d if k == j else 0) for k in range(2)], b2))))
checks.append(("b2", d_b2, numeric(lambda d: (W1, b1, w2, b2 + d))))
for name, a, n in checks:
    rel = abs(a - n) / max(1e-12, abs(a) + abs(n))
    worst = max(worst, rel)
    print(f"{name:8s} backprop={a:+.6f}  numeric={n:+.6f}  rel.err={rel:.1e}")
print("gradient check passed:", worst < 1e-7)

# ---------- one gradient descent step lowers the loss ----------
lr = 0.5
W1n = [[W1[j][i] - lr * d_W1[j][i] for i in range(2)] for j in range(2)]
b1n = [b1[j] - lr * d_b1[j] for j in range(2)]
w2n = [w2[j] - lr * d_w2[j] for j in range(2)]
print("loss before", round(L, 4), "-> after one step", round(forward(W1n, b1n, w2n, b2 - lr * d_b2)[3], 4))
` },
      { lang: 'python', title: 'Backprop trains a 2-4-1 network to learn XOR (runnable)', run: true, code: `import math, random
random.seed(1)

X = [[0, 0], [0, 1], [1, 0], [1, 1]]
Y = [0, 1, 1, 0]                      # XOR: no straight line separates these
H = 4
W1 = [[random.uniform(-1, 1) for _ in range(2)] for _ in range(H)]
b1 = [0.0] * H
w2 = [random.uniform(-1, 1) for _ in range(H)]
b2 = 0.0
sig = lambda t: 1 / (1 + math.exp(-t))
lr = 0.5

for epoch in range(5001):
    gW = [[0.0, 0.0] for _ in range(H)]; gb1 = [0.0] * H; gw2 = [0.0] * H; gb2 = 0.0
    loss = 0.0
    for x, y in zip(X, Y):
        h = [math.tanh(W1[j][0] * x[0] + W1[j][1] * x[1] + b1[j]) for j in range(H)]
        p = sig(sum(w2[j] * h[j] for j in range(H)) + b2)
        loss += -(y * math.log(p) + (1 - y) * math.log(1 - p)) / 4
        d = (p - y) / 4                           # BCE + sigmoid: dL/dz = p - y (averaged)
        gb2 += d
        for j in range(H):
            gw2[j] += d * h[j]
            dz = d * w2[j] * (1 - h[j] ** 2)       # tanh slope = 1 - tanh^2
            gb1[j] += dz
            gW[j][0] += dz * x[0]; gW[j][1] += dz * x[1]
    for j in range(H):
        w2[j] -= lr * gw2[j]; b1[j] -= lr * gb1[j]
        W1[j][0] -= lr * gW[j][0]; W1[j][1] -= lr * gW[j][1]
    b2 -= lr * gb2
    if epoch % 1000 == 0:
        print(f"epoch {epoch:4d}  loss {loss:.4f}")

for x in X:
    h = [math.tanh(W1[j][0] * x[0] + W1[j][1] * x[1] + b1[j]) for j in range(H)]
    print(x, "->", round(sig(sum(w2[j] * h[j] for j in range(H)) + b2), 3))
` },
      { lang: 'python', title: 'Same network, gradients by PyTorch autograd (shown, not run here)', code: `import torch

x, y = torch.tensor([1.0, 2.0]), torch.tensor(1.0)
W1 = torch.tensor([[0.1, 0.2], [-0.3, 0.4]], requires_grad=True)
b1 = torch.zeros(2, requires_grad=True)
w2 = torch.tensor([0.5, -0.5], requires_grad=True)
b2 = torch.tensor(0.0, requires_grad=True)

h = torch.sigmoid(W1 @ x + b1)
y_hat = w2 @ h + b2
L = 0.5 * (y_hat - y) ** 2
L.backward()
print(W1.grad)   # [[-0.1175, -0.2350], [ 0.1175,  0.2350]]  -- same as our hand calculation
print(w2.grad)   # [-0.6225, -0.6225]
` }
    ],
    codeTitle: ['By hand + gradient check', 'Learning XOR', 'PyTorch'],
    viz: {
      title: 'Forward and backward pass through a 2-2-1 network',
      input: '1 2 | 1',
      inputLabel: 'x1 x2 | target y   (weights fixed: W1 = [[0.1, 0.2], [−0.3, 0.4]], b1 = 0, w2 = [0.5, −0.5], b2 = 0)',
      gen: function (input) {
        var p = splitBar(input, 2, '1 2 | 1');
        var x = nums(p[0], 'x1 x2', 2), y = Number(p[1]);
        if (x.length !== 2) throw new Error('Give two inputs, e.g. 1 2 | 1');
        if (!isFinite(y) || Math.abs(y) > 10 || x.some(function (v) { return Math.abs(v) > 10; })) throw new Error('Keep inputs and target between -10 and 10');
        var W1 = [[0.1, 0.2], [-0.3, 0.4]], b1 = [0, 0], w2 = [0.5, -0.5], b2 = 0;
        function fwd(W, bb, v, c) {
          var z = [0, 1].map(function (j) { return W[j][0] * x[0] + W[j][1] * x[1] + bb[j]; });
          var h = z.map(sig), yh = v[0] * h[0] + v[1] * h[1] + c;
          return { z: z, h: h, yh: yh, L: 0.5 * (yh - y) * (yh - y) };
        }
        var f = fwd(W1, b1, w2, b2), z = f.z, h = f.h, yh = f.yh, L = f.L;
        var dy = yh - y, dw2 = [dy * h[0], dy * h[1]], dh = [dy * w2[0], dy * w2[1]];
        var dz = [dh[0] * h[0] * (1 - h[0]), dh[1] * h[1] * (1 - h[1])];
        var dW1 = [[dz[0] * x[0], dz[0] * x[1]], [dz[1] * x[0], dz[1] * x[1]]];
        var nodes = [{ id: 'x1', label: 'x1', x: 8, y: 14 }, { id: 'x2', label: 'x2', x: 8, y: 46 }, { id: 'h1', label: 'h1', x: 42, y: 14 }, { id: 'h2', label: 'h2', x: 42, y: 46 }, { id: 'o', label: 'ŷ', x: 72, y: 30 }, { id: 'L', label: 'L', x: 93, y: 30 }];
        var edgesW = function (lab) { return [['x1', 'h1', lab[0]], ['x2', 'h1', lab[1]], ['x1', 'h2', lab[2]], ['x2', 'h2', lab[3]], ['h1', 'o', lab[4]], ['h2', 'o', lab[5]], ['o', 'L', '']]; };
        var wl = ['0.1', '0.2', '−0.3', '0.4', '0.5', '−0.5'];
        function G(lab, hl, ehl, tags, label) { return { type: 'graph', label: label || 'network (edge labels = weights)', directed: true, height: 60, nodes: nodes, edges: edgesW(lab), hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        var F = [];
        F.push({ narr: 'A 2-2-1 network. Edge labels are the weights. Hidden neurons use the sigmoid; the output is linear; the loss is L = ½(ŷ − y)². Inputs x = [' + x + '], target y = ' + y + '.', parts: [G(wl, { x1: 'cur', x2: 'cur' }, {}, { x1: String(x[0]), x2: String(x[1]) })] });
        F.push({ narr: 'Forward, hidden layer: z1 = 0.1·' + x[0] + ' + 0.2·' + x[1] + ' = ' + r4(z[0]) + ' and z2 = −0.3·' + x[0] + ' + 0.4·' + x[1] + ' = ' + r4(z[1]) + '. Then h = σ(z) = [' + r4(h[0]) + ', ' + r4(h[1]) + ']. <b>Saved</b> for later.', parts: [G(wl, { h1: 'cur', h2: 'cur' }, { 'x1-h1': 'cur', 'x2-h1': 'cur', 'x1-h2': 'cur', 'x2-h2': 'cur' }, { x1: String(x[0]), x2: String(x[1]), h1: 'h=' + r4(h[0]), h2: 'h=' + r4(h[1]) }),
          { type: 'vars', vals: { z1: r4(z[0]), z2: r4(z[1]), h1: r4(h[0]), h2: r4(h[1]) } }] });
        F.push({ narr: 'Forward, output: ŷ = 0.5·' + r4(h[0]) + ' − 0.5·' + r4(h[1]) + ' + 0 = <b>' + r4(yh) + '</b>. Loss L = ½(' + r4(yh) + ' − ' + y + ')² = <b>' + r4(L) + '</b>.', parts: [G(wl, { o: 'cur', L: 'bad' }, { 'h1-o': 'cur', 'h2-o': 'cur', 'o-L': 'cur' }, { h1: r4(h[0]), h2: r4(h[1]), o: 'ŷ=' + r4(yh), L: 'L=' + r4(L) })] });
        F.push({ narr: 'Backward starts at the output: <b>dL/dŷ = ŷ − y = ' + r4(dy) + '</b>. ' + (dy < 0 ? 'Negative: the output is too low.' : dy > 0 ? 'Positive: the output is too high.' : 'Zero: already perfect, nothing to learn.'), parts: [G(wl, { o: 'sel' }, {}, { o: 'δ=' + r4(dy) }, 'backward pass')] });
        F.push({ narr: 'Output weights: dL/dw2 = δ · h = [' + r4(dw2[0]) + ', ' + r4(dw2[1]) + '], dL/db2 = ' + r4(dy) + '. Each weight\'s blame = output error × the activation it carried.', parts: [G(['', '', '', '', r4(dw2[0]), r4(dw2[1])], { o: 'sel' }, { 'h1-o': 'sel', 'h2-o': 'sel' }, { o: 'δ=' + r4(dy) }, 'edge labels = gradients'),
          { type: 'vars', vals: { 'dL/dw2[0]': r4(dw2[0]), 'dL/dw2[1]': r4(dw2[1]), 'dL/db2': r4(dy) }, hl: { 'dL/dw2[0]': 'ok', 'dL/dw2[1]': 'ok' } }] });
        F.push({ narr: 'Pass the blame back to the hidden layer: dL/dh = δ · w2 = [' + r4(dh[0]) + ', ' + r4(dh[1]) + ']. Multiply by each sigmoid\'s slope h(1 − h): <b>dL/dz = [' + r4(dz[0]) + ', ' + r4(dz[1]) + ']</b>. Neuron 2 gets the opposite sign because its outgoing weight is negative.', parts: [G(['', '', '', '', r4(dw2[0]), r4(dw2[1])], { h1: 'sel', h2: 'sel' }, { 'h1-o': 'win', 'h2-o': 'win' }, { h1: 'δ=' + r4(dz[0]), h2: 'δ=' + r4(dz[1]) }, 'backward pass'),
          { type: 'table', label: 'hidden deltas', columns: ['neuron', 'dL/dh', 'h(1 − h)', 'dL/dz'], rows: [['1', r4(dh[0]), r4(h[0] * (1 - h[0])), r4(dz[0])], ['2', r4(dh[1]), r4(h[1] * (1 - h[1])), r4(dz[1])]] }] });
        F.push({ narr: 'First-layer weights: dL/dW1[j][i] = δ<sub>j</sub> · x<sub>i</sub> (outer product). All six gradients are now known. Bias gradients equal the deltas.', parts: [G([r4(dW1[0][0]), r4(dW1[0][1]), r4(dW1[1][0]), r4(dW1[1][1]), r4(dw2[0]), r4(dw2[1])], { x1: 'ok', x2: 'ok', h1: 'ok', h2: 'ok', o: 'ok' }, { 'x1-h1': 'ok', 'x2-h1': 'ok', 'x1-h2': 'ok', 'x2-h2': 'ok', 'h1-o': 'ok', 'h2-o': 'ok' }, {}, 'edge labels = gradients'),
          { type: 'grid', label: 'dL/dW1', rows: [[r4(dW1[0][0]), r4(dW1[0][1])], [r4(dW1[1][0]), r4(dW1[1][1])]], rowHead: ['h1', 'h2'], colHead: ['x1', 'x2'] }] });
        var eps = 1e-5, Wp = [[0.1 + eps, 0.2], [-0.3, 0.4]], Wm = [[0.1 - eps, 0.2], [-0.3, 0.4]];
        var num00 = (fwd(Wp, b1, w2, b2).L - fwd(Wm, b1, w2, b2).L) / (2 * eps);
        var num2 = (fwd(W1, b1, [0.5 + eps, -0.5], b2).L - fwd(W1, b1, [0.5 - eps, -0.5], b2).L) / (2 * eps);
        F.push({ narr: '<b>Gradient check</b>: nudge a weight by ±0.00001 and rerun the forward pass. The numeric slopes match backprop, so the backward pass is correct.', parts: [
          { type: 'table', label: 'backprop vs numeric', columns: ['weight', 'backprop', 'numeric', 'difference'], rows: [['W1[0][0]', r6(dW1[0][0]), r6(num00), r6(Math.abs(num00 - dW1[0][0]))], ['w2[0]', r6(dw2[0]), r6(num2), r6(Math.abs(num2 - dw2[0]))]], hl: { 0: 'ok', 1: 'ok' } }] });
        var lr = 0.5;
        var W1n = [[0.1 - lr * dW1[0][0], 0.2 - lr * dW1[0][1]], [-0.3 - lr * dW1[1][0], 0.4 - lr * dW1[1][1]]];
        var Ln = fwd(W1n, [-lr * dz[0], -lr * dz[1]], [0.5 - lr * dw2[0], -0.5 - lr * dw2[1]], -lr * dy).L;
        F.push({ narr: 'Use the gradients: one step with lr = 0.5 on every weight and bias. The loss goes from ' + r4(L) + ' to <b>' + r4(Ln) + '</b>. Training repeats this forward → backward → update loop on many examples.', parts: [
          { type: 'bars', label: 'loss before and after one update', values: [r4(L), r4(Ln)], idxLabels: ['before', 'after'], hl: { 1: Ln <= L ? 'ok' : 'bad' } }] });
        return F;
      }
    },
    examples: [
      { title: 'Shapes tell you the formula', html: `<p>A layer maps 784 inputs to 128 outputs: W is 128×784. δ = dL/dz has 128 slots, the input a has 784. The only way to build a 128×784 gradient from them is the outer product δ·aᵀ. The gradient sent back must have 784 slots: Wᵀ·δ is (784×128)(128) = 784. ✓ Shape-matching is the fastest way to recall backprop rules.</p>` },
      { title: 'A batch of examples', html: `<p>With a batch of B examples stacked as rows of A (B×784) and deltas Δ (B×128), the weight gradient is Δᵀ·A / B: one matrix multiplication that sums the B outer products and averages them. This is why GPUs, which are matrix-multiplication machines, are so good at training.</p>` },
      { title: 'Why all-zero initialisation fails', html: `<p>If W1 starts as all zeros, both hidden neurons compute the same h, receive the same δ, get the same update, and stay identical forever: the layer behaves like one neuron. Random initialisation breaks the symmetry. Schemes like Xavier/Glorot and He initialisation choose the random spread so that activations and gradients keep a steady size from layer to layer.</p>` },
      { title: 'Vanishing gradients in numbers', html: `<p>Five sigmoid layers, each δ multiplied by σ′(z) ≤ 0.25 and by weights around 1: the first layer's δ is at most 0.25<sup>5</sup> ≈ <span class="c-r">0.001</span> of the last layer's. ReLU (slope 1 when active), residual connections (an identity path with slope 1) and normalisation layers keep this product healthy.</p>` }
    ],
    deepDive: `<p><b>🟣 Cost of backprop.</b> The backward pass does about twice the arithmetic of the forward pass (for each matrix multiply in the forward, there are two in the backward: one for dW and one for the gradient passed back). So one training step costs roughly 3× a forward pass, and the often-quoted training compute estimate for transformers is about 6 × parameters × tokens FLOPs (2 forward + 4 backward).</p>
      <p><b>Memory.</b> Every activation needed by the backward pass is stored: for a transformer that grows with batch size × sequence length × hidden size × layers. Activation checkpointing (recompute instead of store), mixed precision (bf16 activations) and fused kernels such as FlashAttention (which recomputes attention scores in the backward pass) exist to fit this into GPU memory.</p>
      <p><b>Gradient check details.</b> Use float64, a step around 10<sup>−5</sup>, and the relative error |a − n| / (|a| + |n|). Around 10<sup>−7</sup> or less is good; 10<sup>−4</sup> suggests a bug. Avoid kinks (ReLU exactly at 0, max operations with ties) where numeric and analytic answers legitimately differ, turn off dropout and other randomness, and check a few random parameters per tensor for big models.</p>
      <p><b>Softmax + cross-entropy shortcut.</b> For a classification output the combined δ at the logits is p − one_hot, so backprop for the final layer is just "probabilities minus targets", then the same three rules. This is the same cancellation as sigmoid + BCE.</p>`,
    aiEra: `<p><b>🤖 Where you meet this in AI work.</b> You will not hand-write backprop for production models, but you will: read papers that state gradients in this notation, write custom autograd functions or Triton kernels whose backward you must derive, debug NaNs that start in a backward pass, and reason about memory (why a 7B-parameter model needs far more GPU memory to fine-tune than to run). Parameter-efficient fine-tuning (LoRA) saves memory precisely because gradients and optimiser state are kept only for small adapter matrices.</p>
      <p><b>Working with AI assistants.</b> Assistants can derive backward passes, but the classic slips are a missing activation-slope factor, a transposed outer product, and forgetting to average over the batch. Insist on a gradient-check test with random shapes that are not square (so transposes cannot hide), run it in float64, and only then trust the code. When comparing with PyTorch, call <code>torch.autograd.gradcheck</code> on your function.</p>`,
    problems: [
      PR('backprop', {
        title: 'Backprop Through a Tiny Network', level: 'Hard', tags: ['backpropagation', 'neural networks', 'chain rule'], companies: ['OpenAI', 'Google DeepMind', 'Anthropic'],
        statement: `<p>A network has input vector x (length D), a hidden layer of H sigmoid neurons <code>h = σ(W1·x + b1)</code> (W1 is H×D), and a linear output <code>ŷ = w2·h + b2</code>. The loss is <code>L = ½(ŷ − y)²</code>. Write <code>backprop_tiny(x, y, W1, b1, w2, b2)</code> that returns one flat list: <code>[L, dW1 row by row…, db1…, dw2…, db2]</code>.</p>`,
        constraints: `<p>1 ≤ D, H ≤ 16. Values are floats with |value| ≤ 10. Compared with a small tolerance.</p>`,
        example: `<p><code>x = [1, 2], y = 1, W1 = [[0.1, 0.2], [−0.3, 0.4]], b1 = [0, 0], w2 = [0.5, −0.5], b2 = 0</code> →<br><code class="c-g">[0.5, −0.1175, −0.2350, 0.1175, 0.2350, −0.1175, 0.1175, −0.6225, −0.6225, −1.0]</code>.</p>
          <p>Why: z1 = [0.5, 0.5], h = [0.6225, 0.6225], ŷ = 0, L = 0.5. δ<sub>out</sub> = −1, dw2 = −h, dh = δ<sub>out</sub>·w2 = [−0.5, 0.5], times σ′ = 0.235 gives δ = [−0.1175, 0.1175], and dW1 = δ·xᵀ.</p>`,
        bruteWhy: `<p>Numeric differentiation of each of the H·D + 2H + 1 parameters needs two full forward passes each. For this tiny net it is fine (and it is exactly the gradient check in the practice set), but its cost grows with the number of parameters, while backprop gets them all from one backward pass.</p>`,
        mcq: { q: `In this network, which quantity do you need from the forward pass to compute dL/dW1?`, options: ['h (to get the sigmoid slope h(1 − h)) and x', 'only ŷ', 'only the loss L', 'nothing: the gradient does not depend on the forward pass'], answer: 0, explain: `δ = (ŷ − y)·w2 ⊙ h(1 − h), and dW1 = δ·xᵀ. Both the cached activations h and the input x are needed, which is why frameworks store activations.` },
        hints: [
          `Hint 1: Do the forward pass first and keep z1 (or h) and ŷ. Then start the backward pass with d_yhat = ŷ − y.`,
          `Hint 2: Output layer: dw2[j] = d_yhat·h[j], db2 = d_yhat. Hidden: d_z[j] = d_yhat·w2[j]·h[j]·(1 − h[j]). First layer: dW1[j][i] = d_z[j]·x[i], db1 = d_z.`,
          `Hint 3: Watch the output order: [L] + dW1 flattened row by row (row j = hidden neuron j) + db1 + dw2 + [db2]. Use 1/(1 + math.exp(−t)) for σ; inputs are small enough not to overflow.`
        ],
        approach: `<p>Forward with caching, then the three layer rules backwards: weights get δ × input, biases get δ, and the earlier layer gets Wᵀδ times its activation slope. Flatten in the requested order.</p>`,
        dry: { head: ['step', 'value for the example'], rows: [['z1, h', '[0.5, 0.5], [0.6225, 0.6225]'], ['ŷ, L', '0, 0.5'], ['d_yhat', '−1'], ['dw2, db2', '[−0.6225, −0.6225], −1'], ['d_z = d_yhat·w2·h(1−h)', '[−0.1175, 0.1175]'], ['dW1 = d_z·xᵀ', '[[−0.1175, −0.2350], [0.1175, 0.2350]]']] },
        complexity: `<p>O(H·D) time for both passes (the size of W1), O(H) extra space for the cached activations and deltas.</p>`,
        followUps: ['Extend it to a batch of examples and average the gradients.', 'Replace the sigmoid with ReLU. Which line changes?', 'Add a second hidden layer. What is the general pattern?']
      })
    ]
  });

  // ===================== TOPIC 7: OPTIMISERS =====================
  topics.push({
    title: 'Optimisers: Momentum, RMSProp, Adam, AdamW and Schedules',
    analogy: `<p>Plain gradient descent is a hiker who forgets everything after each step: in a narrow, winding canyon she bounces from wall to wall. <b>Momentum</b> turns her into a heavy ball rolling downhill: it keeps its speed along the canyon floor, and the side-to-side pushes cancel out. <b>Adam</b> goes further and gives each direction its own shoes: on steep, slippery walls it takes small careful steps, on the gentle canyon floor it strides out. Same hill, much faster trip.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> An <b>optimiser</b> decides how to turn a gradient into a weight update. Plain SGD uses only today's gradient. Better optimisers keep a little <b>memory</b> (running averages) so updates are smoother and better scaled.</p>
      <h4>1. Momentum: remember the direction</h4>
      <p><code>v ← β·v + g</code>, then <code>w ← w − lr·v</code>. β (often 0.9) is how much of the old velocity survives. If gradients keep pointing the same way, v builds up (up to 1/(1 − β) = 10× the gradient). If they flip sign every step (zig-zag), they cancel.</p>
      ${H.table(['step', 'gradient g', 'v = 0.9·v + g', 'move −lr·v (lr = 0.1)'], [['1', '1', '1', '−0.1'], ['2', '1', '1.9', '−0.19'], ['3', '1', '2.71', '−0.271'], ['…', '1', '→ 10', '→ −1.0'], ['zig-zag', '+1, −1, +1', '1, −0.1, 0.91', 'tiny: the swings cancel']])}
      <h4>2. RMSProp: scale each weight by its typical gradient size</h4>
      <p>Keep a running average of <b>squared</b> gradients, <code>s ← ρ·s + (1 − ρ)·g²</code>, and divide: <code>w ← w − lr·g / (√s + ε)</code>. A weight whose gradients are always huge gets small steps; a weight with tiny gradients gets bigger ones. Every weight gets its own effective learning rate.</p>
      <h4>3. Adam = momentum + RMSProp + bias correction</h4>
      <ol><li><code>m ← β₁·m + (1 − β₁)·g</code>   (average gradient: direction, β₁ = 0.9)</li>
      <li><code>v ← β₂·v + (1 − β₂)·g²</code>   (average squared gradient: size, β₂ = 0.999)</li>
      <li><code>m̂ = m / (1 − β₁ᵗ)</code>, <code>v̂ = v / (1 − β₂ᵗ)</code>   (bias correction, t = step number from 1)</li>
      <li><code>w ← w − lr · m̂ / (√v̂ + ε)</code>   (ε ≈ 10<sup>−8</sup> prevents division by 0)</li></ol>
      <p><b>Worked step.</b> w = 1, first gradient g = 0.5, lr = 0.1. m = 0.1·0.5 = 0.05, v = 0.001·0.25 = 0.00025. Bias correction at t = 1: m̂ = 0.05/0.1 = 0.5, v̂ = 0.00025/0.001 = 0.25. Step = 0.1·0.5/√0.25 = 0.1·0.5/0.5 = <b>0.1</b>, so w = <b class="c-g">0.9</b>.</p>
      <p>Notice: the step is lr × (a ratio of about ±1). Adam's step size is roughly lr <i>whatever the gradient's scale</i>, which makes lr = 10<sup>−3</sup> a decent default across many problems. Without bias correction the first steps would be 10× too small, because m and v start at 0.</p>
      <h4>4. AdamW: weight decay done right</h4>
      <p>Adding an L2 penalty to the loss (topic 8) puts λw into the gradient, and Adam then divides it by √v̂, so heavily-updated weights are barely regularised. <b>AdamW</b> applies the decay separately: <code>w ← w − lr·λ·w</code> plus the normal Adam step. That is the default optimiser for training transformers.</p>
      <h4>5. Learning-rate schedules and clipping</h4>
      ${H.table(['technique', 'what it does', 'why'], [
        ['linear warm-up', 'lr rises from ~0 to its peak over the first steps (e.g. 1–5%)', 'Adam\'s early v̂ is noisy; big early steps can blow up'],
        ['cosine decay', 'lr = min + ½(peak − min)(1 + cos(π·progress))', 'big steps early, small careful steps at the end'],
        ['step decay', 'divide lr by 10 at set epochs', 'classic for CNNs with SGD + momentum'],
        ['gradient clipping', 'if ‖g‖ &gt; c, rescale g to length c', 'stops one bad batch from wrecking the weights']
      ])}`,
    clues: [
      '"loss zig-zags in a narrow valley", "ill-conditioned" → momentum (or Adam)',
      '"features or parameters with very different gradient scales", "sparse gradients" → adaptive methods (AdaGrad, RMSProp, Adam)',
      '"default optimiser for transformers / LLMs" → AdamW with warm-up and cosine (or linear) decay',
      '"why bias correction in Adam" → m and v start at 0, so early averages are too small',
      '"memory cost of Adam" → two extra numbers (m, v) per parameter',
      '"training spikes / instability" → warm-up, lower peak lr, gradient clipping'
    ],
    code: [
      { lang: 'python', title: 'Plain SGD vs momentum on a stretched bowl (runnable)', run: true, code: `# f(x, y) = 0.5 * (x^2 + 25 * y^2): 25 times steeper in y than in x (condition number 25)
def grad(x, y):
    return x, 25 * y

def f(x, y):
    return 0.5 * (x * x + 25 * y * y)

def run(lr, beta, steps):
    x, y = 10.0, 1.0
    vx = vy = 0.0
    history = []
    for _ in range(steps):
        gx, gy = grad(x, y)
        vx, vy = beta * vx + gx, beta * vy + gy     # velocity (beta = 0 is plain SGD)
        x, y = x - lr * vx, y - lr * vy
        history.append(f(x, y))
    return history

lr = 0.05             # plain SGD is only stable for lr < 2/25 = 0.08
plain = run(lr, 0.0, 100)
mom = run(lr, 0.7, 100)
for s in [1, 5, 10, 25, 50, 100]:
    print(f"step {s:3d}   SGD f={plain[s - 1]:10.6f}   momentum f={mom[s - 1]:10.6f}")

def steps_to(hist, tol=1e-6):
    return next((i + 1 for i, v in enumerate(hist) if v < tol), None)
print("steps to reach f < 1e-6:  SGD", steps_to(run(lr, 0.0, 2000)), "  momentum 0.7", steps_to(run(lr, 0.7, 2000)))
print("too much momentum (beta 0.9) swings around:", steps_to(run(lr, 0.9, 2000)), "steps")
` },
      { lang: 'python', title: 'Adam step by step, printing every intermediate value (runnable)', run: true, code: `import math

def adam_trace(grad_fn, w, lr=0.1, b1=0.9, b2=0.999, eps=1e-8, steps=5):
    m = v = 0.0
    print(" t      g         m          v        m_hat     v_hat      step       w")
    for t in range(1, steps + 1):
        g = grad_fn(w)
        m = b1 * m + (1 - b1) * g              # running mean of gradients
        v = b2 * v + (1 - b2) * g * g          # running mean of squared gradients
        m_hat = m / (1 - b1 ** t)              # bias correction
        v_hat = v / (1 - b2 ** t)
        step = lr * m_hat / (math.sqrt(v_hat) + eps)
        w -= step
        print(f"{t:2d} {g:9.4f} {m:9.5f} {v:10.7f} {m_hat:9.4f} {v_hat:9.5f} {step:9.5f} {w:9.4f}")
    return w

# minimise f(w) = (w - 3)^2 from w = 0: gradient 2(w - 3)
adam_trace(lambda w: 2 * (w - 3), 0.0)

# Adam's step is about lr no matter how big the gradient is:
for scale in [0.001, 1, 1000]:
    m = (1 - 0.9) * scale; v = (1 - 0.999) * scale ** 2
    step = 0.1 * (m / 0.1) / (math.sqrt(v / 0.001) + 1e-8)
    print(f"gradient {scale:>7}: first Adam step = {step:.4f}   (plain SGD step would be {0.1 * scale:g})")
` },
      { lang: 'python', title: 'Optimisers and schedules in PyTorch (shown, not run here)', code: `import torch

model = torch.nn.Linear(10, 1)
# AdamW: Adam with decoupled weight decay (the standard for transformers)
opt = torch.optim.AdamW(model.parameters(), lr=3e-4, betas=(0.9, 0.999), eps=1e-8, weight_decay=0.01)
# alternatives: torch.optim.SGD(params, lr=0.1, momentum=0.9, nesterov=True), torch.optim.Adam(params, lr=1e-3)

total, warmup = 10_000, 500
import math
def warmup_cosine(step):                       # a multiplier on the peak lr
    if step < warmup:
        return (step + 1) / warmup
    progress = (step - warmup) / (total - warmup)
    return 0.5 * (1 + math.cos(math.pi * progress))
sched = torch.optim.lr_scheduler.LambdaLR(opt, warmup_cosine)

for step in range(total):
    x, y = torch.randn(32, 10), torch.randn(32, 1)
    loss = torch.nn.functional.mse_loss(model(x), y)
    opt.zero_grad()
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)   # gradient clipping
    opt.step()
    sched.step()
` }
    ],
    codeTitle: ['Momentum vs SGD', 'Adam by hand', 'PyTorch'],
    viz: [{
      title: 'Plain SGD vs momentum in a narrow valley',
      input: '0.05 | 0.7 | 12',
      inputLabel: 'learning rate | momentum β | steps   on f = ½(x² + 25y²) from (10, 1)',
      gen: function (input) {
        var p = splitBar(input, 3, '0.05 | 0.7 | 12');
        var lr = Number(p[0]), beta = Number(p[1]), n = Math.round(Number(p[2]));
        if (!isFinite(lr) || lr <= 0 || lr > 0.2) throw new Error('Learning rate between 0 and 0.2 (plain SGD is stable below 0.08 here)');
        if (!isFinite(beta) || beta < 0 || beta >= 1) throw new Error('Momentum β must be in [0, 1), e.g. 0.7');
        if (!isFinite(n) || n < 3 || n > 25) throw new Error('Steps between 3 and 25');
        var f = function (x, y) { return 0.5 * (x * x + 25 * y * y); };
        var s = { x: 10, y: 1 }, m = { x: 10, y: 1, vx: 0, vy: 0 }, F = [], rows = [], lf = [f(10, 1)], lm = [f(10, 1)];
        F.push({ narr: 'The valley <b>f = ½(x² + 25y²)</b> is 25× steeper across (y) than along (x). Both runners start at (10, 1). Plain SGD: w ← w − lr·g. Momentum: v ← ' + beta + '·v + g, w ← w − lr·v. Same lr = ' + lr + ' for both.', parts: [
          { type: 'table', label: 'start', columns: ['optimiser', 'x', 'y', 'f'], rows: [['SGD', 10, 1, r4(f(10, 1))], ['momentum', 10, 1, r4(f(10, 1))]] }] });
        for (var i = 1; i <= n; i++) {
          var gx = s.x, gy = 25 * s.y;
          s.x -= lr * gx; s.y -= lr * gy;
          var hx = m.x, hy = 25 * m.y;
          m.vx = beta * m.vx + hx; m.vy = beta * m.vy + hy;
          m.x -= lr * m.vx; m.y -= lr * m.vy;
          if (!isFinite(s.x + s.y + m.x + m.y) || Math.abs(s.y) > 1e6 || Math.abs(m.y) > 1e6) {
            F.push({ narr: 'Step ' + i + ': a runner has shot off to huge values: <b>diverged</b>. Lower the learning rate (plain SGD needs lr &lt; 2/25 = 0.08 here).', parts: [{ type: 'vars', vals: { 'SGD y': r3(s.y), 'momentum y': r3(m.y) }, hl: { 'SGD y': 'bad', 'momentum y': 'bad' } }] });
            break;
          }
          lf.push(r4(f(s.x, s.y))); lm.push(r4(f(m.x, m.y)));
          rows.push([i, r3(s.x), r3(s.y), r4(f(s.x, s.y)), r3(m.x), r3(m.y), r4(f(m.x, m.y))]);
          var better = f(m.x, m.y) < f(s.x, s.y);
          F.push({ narr: 'Step ' + i + ': SGD is at (' + r3(s.x) + ', ' + r3(s.y) + '), momentum at (' + r3(m.x) + ', ' + r3(m.y) + '). ' + (i <= 2 ? 'Early on they look alike: momentum has not built up speed yet.' : better ? 'Momentum is <b>ahead</b>: its velocity along x keeps growing while the y swings partly cancel.' : 'Momentum overshoots a little here; heavy balls swing before they settle.'), parts: [
            { type: 'table', label: 'positions (last 6 steps)', columns: ['step', 'SGD x', 'SGD y', 'SGD f', 'mom x', 'mom y', 'mom f'], rows: rows.slice(-6).map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[Math.min(rows.length, 6) - 1] = 'cur'; return o; })() },
            { type: 'bars', label: 'SGD loss per step', values: lf.slice(), hl: (function () { var o = {}; o[lf.length - 1] = 'cur'; return o; })() },
            { type: 'bars', label: 'momentum loss per step', values: lm.slice(), hl: (function () { var o = {}; o[lm.length - 1] = better ? 'ok' : 'cur'; return o; })() }] });
        }
        F.push({ narr: 'Why: plain SGD\'s progress along x is capped by the steep y direction (lr must stay below 2/25), so x shrinks by only (1 − lr) per step. Momentum accumulates the consistent x-gradient into speed (up to 1/(1 − β) = ' + r3(1 / (1 - beta)) + '×) while the alternating y-gradients cancel. Final f: SGD ' + lf[lf.length - 1] + ', momentum ' + lm[lm.length - 1] + '.', parts: [
          { type: 'vars', vals: { 'SGD final f': lf[lf.length - 1], 'momentum final f': lm[lm.length - 1] }, hl: { 'momentum final f': lm[lm.length - 1] < lf[lf.length - 1] ? 'ok' : 'cur' } }] });
        return F;
      }
    }, {
      title: 'One weight through Adam, step by step',
      input: '0.5 0.4 -0.2 0.3 0.1 | 0.1',
      inputLabel: 'a sequence of gradients | learning rate   (β₁ = 0.9, β₂ = 0.999, start w = 1)',
      gen: function (input) {
        var p = splitBar(input, 2, '0.5 0.4 -0.2 0.3 0.1 | 0.1');
        var gs = nums(p[0], 'the gradients', 10), lr = Number(p[1]);
        if (gs.length < 3) throw new Error('Give at least 3 gradients');
        if (!isFinite(lr) || lr <= 0 || lr > 1) throw new Error('Learning rate between 0 and 1');
        var b1 = 0.9, b2 = 0.999, eps = 1e-8, w = 1, m = 0, v = 0, F = [], ws = [1], rows = [];
        F.push({ narr: 'Adam keeps two memories per weight: <b>m</b> (average gradient, the direction) and <b>v</b> (average squared gradient, the typical size). Both start at 0. Start w = 1, lr = ' + lr + '.', parts: [{ type: 'vars', vals: { w: 1, m: 0, v: 0, 'β₁': b1, 'β₂': b2 } }] });
        gs.forEach(function (g, i) {
          var t = i + 1;
          m = b1 * m + (1 - b1) * g; v = b2 * v + (1 - b2) * g * g;
          var mh = m / (1 - Math.pow(b1, t)), vh = v / (1 - Math.pow(b2, t)), step = lr * mh / (Math.sqrt(vh) + eps);
          w -= step; ws.push(r4(w));
          rows.push([t, g, r6(m), r6(v), r4(mh), r6(vh), r4(step), r4(w)]);
          F.push({ narr: 't = ' + t + ', gradient <b>' + g + '</b>. m = 0.9·m + 0.1·g = ' + r6(m) + ', v = 0.999·v + 0.001·g² = ' + r6(v) + '. Bias-corrected: m̂ = m/(1 − 0.9<sup>' + t + '</sup>) = ' + r4(mh) + ', v̂ = ' + r6(vh) + '. Step = lr·m̂/√v̂ = <b>' + r4(step) + '</b>, so w = ' + r4(w) + '.' + (t === 1 ? ' At t = 1 the step is exactly lr × sign(g): Adam normalises away the gradient\'s size.' : ''), parts: [
            { type: 'table', label: 'Adam trace', columns: ['t', 'g', 'm', 'v', 'm̂', 'v̂', 'step', 'w'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[i] = 'cur'; return o; })() },
            { type: 'bars', label: 'w after each step', values: ws.slice(), hl: (function () { var o = {}; o[ws.length - 1] = 'ok'; return o; })() }] });
        });
        F.push({ narr: 'Summary: every step was about lr in size, even though the gradients varied. When gradients flip sign (like the negative one), m shrinks and so does the step: momentum smooths the noise. That is why Adam is robust and why lr ≈ 1e-3 is a sensible default.', parts: [
          { type: 'vars', vals: { 'final w': r4(w), 'final m': r6(m), 'final v': r6(v) }, hl: { 'final w': 'sel' } }] });
        return F;
      }
    }],
    examples: [
      { title: 'Momentum\'s top speed', html: `<p>With a constant gradient g, v converges to g/(1 − β). β = 0.9 → 10g; β = 0.99 → 100g. So momentum with lr = 0.01 and β = 0.9 travels as fast as plain SGD with lr = 0.1 on a straight slope, but without the zig-zag. That is why you often lower lr when you raise β.</p>` },
      { title: 'Bias correction in numbers', html: `<p>t = 1, g = 2: m = 0.2 but the true average gradient is 2. Correction: 0.2 / (1 − 0.9) = 2. ✓ v = 0.004, corrected 0.004 / 0.001 = 4 = g². ✓ By t = 50, 1 − 0.9⁵⁰ ≈ 0.995, so m barely needs correcting, but v still does (1 − 0.999⁵⁰ ≈ 0.049): bias correction matters for v for the first few thousand steps.</p>` },
      { title: 'Warm-up plus cosine schedule', html: `<p>Peak lr 1e-3, 100 steps total, 10 warm-up steps, minimum 0. Step 0: 1e-4. Step 9: 1e-3 (end of warm-up). Step 55 (half-way through the decay): 0.5·1e-3·(1 + cos(π/2)) = <b>5e-4</b>. Step 100: 0.</p>`, code: { lang: 'python', run: true, code: `import math
def lr_at(step, total=100, warmup=10, peak=1e-3, low=0.0):
    if step < warmup:
        return peak * (step + 1) / warmup
    progress = (step - warmup) / (total - warmup)
    return low + 0.5 * (peak - low) * (1 + math.cos(math.pi * progress))
for s in [0, 5, 9, 10, 32, 55, 77, 100]:
    print(s, f"{lr_at(s):.6f}")
` } },
      { title: 'Adam\'s memory bill', html: `<p>A 7-billion-parameter model in bf16 needs 14 GB for weights. Training with Adam adds gradients (14 GB) and m and v, usually kept in fp32 (28 GB each), plus an fp32 master copy of the weights (28 GB): over 100 GB before activations. This is why optimiser-state sharding (ZeRO, FSDP), 8-bit Adam and memory-light optimisers exist.</p>` }
    ],
    deepDive: `<p><b>🟣 Why momentum helps, precisely.</b> On a quadratic with condition number κ, plain GD needs about κ steps per "digit" of accuracy; heavy-ball momentum with tuned lr and β = ((√κ − 1)/(√κ + 1))² needs about √κ. For κ = 10,000 that is 100× fewer steps. Nesterov momentum evaluates the gradient at the look-ahead point w − lr·β·v, which gives the same √κ rate with guarantees for all smooth convex functions.</p>
      <p><b>Adam's implicit behaviour.</b> Adam's update m̂/√v̂ is roughly a per-coordinate sign of the smoothed gradient with magnitude ≤ about 1, so it behaves like "sign descent" with smoothing. That makes it robust to gradient scale and to badly scaled parameters (embeddings vs layer norms), which is a big part of why it suits transformers. It can generalise slightly worse than SGD + momentum on some vision tasks, which is why CNN recipes still often use SGD.</p>
      <p><b>ε and β₂ matter at scale.</b> When gradients are tiny, ε dominates √v̂ and the step shrinks (see the practice problem with g = 10<sup>−4</sup>). Large-model recipes sometimes lower β₂ to 0.95 so v reacts faster to gradient spikes, reducing instability. Newer optimisers (Lion, Adafactor, Shampoo, Muon) trade memory, speed and stability in different ways; AdamW is still a common, safe default.</p>
      <p><b>Schedules and the loss curve.</b> Most of the loss drop at the end of training comes from decaying the learning rate: high lr explores, low lr settles into the bottom of the valley. "Warm-up, stable, decay" (WSD) schedules hold the peak for most of training and decay quickly at the end, which makes it easy to continue training from a checkpoint.</p>`,
    aiEra: `<p><b>🤖 Where you meet this in AI work.</b> Almost every fine-tuning config you touch (Hugging Face <code>TrainingArguments</code>, Axolotl, torchtune) has <code>optim: adamw</code>, <code>learning_rate</code>, <code>warmup_ratio</code>, <code>lr_scheduler_type: cosine</code>, <code>weight_decay</code> and <code>max_grad_norm</code>. Now you know what each one does. Optimiser state is also why checkpoints for training are several times bigger than inference weights, and why resuming training without the optimiser state causes a loss spike.</p>
      <p><b>Working with AI assistants.</b> Assistants sometimes use <code>torch.optim.Adam(weight_decay=…)</code> when they mean AdamW (the former is L2 inside Adam, the coupled version), forget <code>scheduler.step()</code> or call it per epoch when it was configured per step, and apply weight decay to biases and LayerNorm weights (most recipes exclude them). Ask for the learning-rate value to be logged every step; a plotted schedule catches most of these bugs instantly.</p>`,
    problems: [
      PR('adam', {
        title: 'One Adam Update', level: 'Medium', tags: ['optimisers', 'Adam'], companies: ['OpenAI', 'NVIDIA', 'Meta'],
        statement: `<p>Write <code>adam_step(w, g, m, v, t, lr, beta1, beta2, eps)</code> that performs one Adam update for a single weight w with gradient g, previous moments m and v, and step number t (starting from 1). Return <code>[new_w, new_m, new_v]</code> (the stored m and v, <i>not</i> the bias-corrected ones).</p>`,
        constraints: `<p>t ≥ 1, 0 &lt; beta1, beta2 &lt; 1, eps &gt; 0, v ≥ 0. Compared with a small tolerance.</p>`,
        example: `<p><code>w = 1, g = 0.5, m = 0, v = 0, t = 1, lr = 0.1, β₁ = 0.9, β₂ = 0.999, ε = 1e-8</code> → <code class="c-g">[0.9, 0.05, 0.00025]</code> (w is 0.900000002 because of ε).</p>
          <p>Why: m = 0.05, v = 0.00025, m̂ = 0.5, v̂ = 0.25, step = 0.1·0.5/0.5 = 0.1.</p>`,
        bruteWhy: `<p>A "brute" version skips bias correction. At t = 1 it computes step = 0.1·0.05/√0.00025 = 0.316: three times too big here, and for other β values the early steps are badly off. Bias correction is what makes the first steps sensible.</p>`,
        mcq: { q: `At t = 1 (m = v = 0 before the step), what is Adam's step size for any non-zero gradient g (ignoring ε)?`, options: ['lr, in the direction of −sign(g)', 'lr × g', 'lr × g²', '0'], answer: 0, explain: `m̂ = g and v̂ = g², so m̂/√v̂ = g/|g| = sign(g). The first step is exactly lr long, whatever the gradient's size.` },
        hints: [
          `Hint 1: Update the two running averages first, using the new gradient: m with β₁ and g, v with β₂ and g².`,
          `Hint 2: Bias-correct with the step number: m̂ = m / (1 − β₁ᵗ), v̂ = v / (1 − β₂ᵗ). Do not store these.`,
          `Hint 3: Step: w − lr·m̂ / (√v̂ + ε). Return [w, m, v] with the uncorrected m and v. A zero gradient with zero moments must leave w unchanged (ε prevents 0/0).`
        ],
        approach: `<p>Exponential moving averages for the gradient and its square, bias-correct both by dividing by 1 − βᵗ, then step by lr times their ratio. Store the uncorrected averages for the next step.</p>`,
        dry: { head: ['quantity', 'value (first example)'], rows: [['m = 0.9·0 + 0.1·0.5', '0.05'], ['v = 0.999·0 + 0.001·0.25', '0.00025'], ['m̂ = 0.05 / 0.1', '0.5'], ['v̂ = 0.00025 / 0.001', '0.25'], ['w = 1 − 0.1·0.5/(0.5 + 1e−8)', '0.9']] },
        complexity: `<p>O(1) per weight; for a model, O(P) time and 2P extra memory for m and v.</p>`,
        followUps: ['Turn it into AdamW: where does the weight decay go?', 'Why does a very small gradient (1e-4) give a step slightly smaller than lr?']
      })
    ]
  });

  // ===================== TOPIC 8: OVERFITTING, REGULARISATION, CONVEXITY =====================
  function ridgeSolve(A, b) {
    var n = A.length, M = A.map(function (r, i) { return r.concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      var t = M[c]; M[c] = M[p]; M[p] = t;
      for (var r2 = c + 1; r2 < n; r2++) { var f = M[r2][c] / M[c][c]; for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k]; }
    }
    var x = []; for (var z = 0; z < n; z++) x.push(0);
    for (var i = n - 1; i >= 0; i--) { var s = M[i][n]; for (var j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
    return x;
  }
  topics.push({
    title: 'Overfitting, Regularisation and Convexity',
    analogy: `<p>Two students prepare for an exam. One <b>memorises the answers</b> to last year's paper, word for word: perfect on that paper, lost on any new question. The other learns the <b>ideas</b>: a few mistakes on old papers, but solid on new ones. A model that memorises its training data is <b>overfitting</b>. <b>Regularisation</b> is the teacher saying "keep your explanations simple", which forces the model to learn ideas instead of memorising noise.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Training minimises the loss on the <b>training</b> data, but what we care about is new data. Always measure on a held-out <b>validation</b> set.</p>
      ${H.table(['situation', 'train loss', 'validation loss', 'fix'], [
        ['<span class="c-y">underfitting</span>', 'high', 'high', 'bigger model, more features, train longer'],
        ['<span class="c-g">good fit</span>', 'low', 'low (close to train)', 'ship it'],
        ['<span class="c-r">overfitting</span>', 'very low', 'much higher, often rising', 'more data, regularisation, early stopping, smaller model']
      ])}
      <h4>1. L2 regularisation (ridge, weight decay)</h4>
      <p>Add a penalty for big weights: <code>L<sub>total</sub> = L<sub>data</sub> + λ·Σ w²</code>. Its gradient adds <b>2λw</b>, a constant pull of every weight towards 0. Big wiggly weights are needed to pass exactly through noisy points, so the penalty prefers smoother functions.</p>
      <p><b>Worked example.</b> Fit y ≈ w·x to points (1, 2), (2, 4), (3, 6) with L = mean((wx − y)²) + λw². Setting the derivative to 0 gives <code>w = mean(xy) / (mean(x²) + λ)</code> = 9.333 / (4.667 + λ).</p>
      ${H.table(['λ', 'w', 'effect'], [['0', '2.000', 'fits the data exactly'], ['0.1', '1.958', 'slight shrink'], ['1', '1.647', 'noticeably smaller'], ['10', '0.636', 'heavily shrunk: underfits']])}
      <p>λ is a knob: too small and noise is memorised, too big and the real pattern is squashed. You choose it on the validation set.</p>
      <h4>2. Other regularisers</h4>
      ${H.table(['method', 'idea', 'effect'], [
        ['L1 (lasso)', 'penalty λ·Σ|w|, gradient λ·sign(w)', 'pushes many weights to exactly 0 (feature selection)'],
        ['dropout', 'randomly zero a fraction p of activations during training', 'no neuron can rely on one partner; an ensemble effect'],
        ['early stopping', 'stop when validation loss stops improving, keep the best checkpoint', 'limits how far weights travel from their start'],
        ['data augmentation', 'flip/crop images, paraphrase text, add noise', 'more varied data, often the most effective fix'],
        ['smaller model / fewer features', 'less capacity', 'cannot memorise as much']
      ])}
      <h4>3. Convexity: when is there only one valley?</h4>
      <p>A function is <b>convex</b> if the straight line between any two points on its graph never dips below the graph. Like a bowl: x², |x|, eˣ, MSE for linear regression, cross-entropy for logistic regression. For one variable, f″(x) ≥ 0 everywhere is enough.</p>
      ${H.table(['check: chord midpoint vs curve', 'f(x) = x²', 'f(x) = x⁴ − 3x²'], [['points', 'x = −1 and 2', 'x = −1.2 and 1.2'], ['average of f at the ends', '(1 + 4)/2 = 2.5', '(−2.25 − 2.25)/2 = −2.25'], ['f at the middle point', 'f(0.5) = 0.25', 'f(0) = 0'], ['chord above curve?', '<span class="c-g">yes, 2.5 ≥ 0.25: convex</span>', '<span class="c-r">no, −2.25 &lt; 0: not convex</span>']])}
      <p>Why it matters: for a convex loss, <b>every local minimum is the global minimum</b>, so gradient descent with a sensible learning rate cannot get stuck in a bad valley. Adding λ‖w‖² makes a convex loss <i>strictly</i> convex (exactly one best answer). Neural networks are <b>not</b> convex: hidden layers create many valleys, ridges and saddle points. In practice, for large networks, the local minima SGD finds are usually about as good as each other, and saddle points and flat regions tend to be a bigger obstacle than bad minima.</p>`,
    clues: [
      '"training accuracy 99%, validation 70%" → overfitting: regularise, add data, early stop',
      '"both train and validation error are high" → underfitting: more capacity or features',
      '"penalise large weights", "weight decay", "ridge" → L2: gradient + 2λw',
      '"want a sparse model / feature selection" → L1 (lasso)',
      '"is gradient descent guaranteed to find the global minimum" → only if the loss is convex',
      '"validation loss starts rising while training loss keeps falling" → early stopping point'
    ],
    code: [
      { lang: 'python', title: 'L2 regularisation tames an overfitting polynomial (runnable)', run: true, code: `import math

# 9 noisy training points from sin(pi * x); validation points in between, without noise
xt = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]
noise = [0.15, -0.2, 0.1, 0.2, -0.15, 0.1, -0.2, 0.15, -0.1]
yt = [math.sin(math.pi * x) + e for x, e in zip(xt, noise)]
xv = [-0.875, -0.625, -0.375, -0.125, 0.125, 0.375, 0.625, 0.875]
yv = [math.sin(math.pi * x) for x in xv]
DEG = 7                                       # a very flexible model for 9 points

def feats(x):
    return [x ** d for d in range(DEG + 1)]

def solve(A, b):
    # Gaussian elimination with partial pivoting (see the linear algebra module)
    n = len(A)
    M = [row[:] + [bi] for row, bi in zip(A, b)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            for k in range(c, n + 1):
                M[r][k] -= f * M[c][k]
    w = [0.0] * n
    for i in range(n - 1, -1, -1):
        w[i] = (M[i][n] - sum(M[i][j] * w[j] for j in range(i + 1, n))) / M[i][i]
    return w

def ridge_fit(lam):
    # minimise mean((Xw - y)^2) + lam * sum(w[1:]^2)  ->  (X^T X / n + lam*I) w = X^T y / n
    X, n = [feats(x) for x in xt], len(xt)
    A = [[sum(X[k][i] * X[k][j] for k in range(n)) / n + (lam if i == j and i > 0 else 0)
          for j in range(DEG + 1)] for i in range(DEG + 1)]
    b = [sum(X[k][i] * yt[k] for k in range(n)) / n for i in range(DEG + 1)]
    return solve(A, b)

def mse(w, xs, ys):
    return sum((sum(f * wi for f, wi in zip(feats(x), w)) - y) ** 2 for x, y in zip(xs, ys)) / len(xs)

print("  lambda    train MSE   val MSE   |w|")
for lam in [0, 1e-4, 1e-3, 1e-2, 1e-1, 1]:
    w = ridge_fit(lam)
    print(f"{lam:8g}   {mse(w, xt, yt):9.4f}  {mse(w, xv, yv):8.4f}  {math.sqrt(sum(v * v for v in w)):6.2f}")
print("train error always rises with lambda; validation error is lowest in the middle")
` },
      { lang: 'python', title: 'Weight decay inside gradient descent, and a convexity check (runnable)', run: true, code: `# 1-D ridge by gradient descent: loss = mean((w*x - y)^2) + lam * w^2
xs, ys = [1, 2, 3], [2, 4, 6]
for lam in [0, 0.1, 1, 10]:
    w = 0.0
    for _ in range(500):
        grad = sum(2 * (w * x - y) * x for x, y in zip(xs, ys)) / len(xs) + 2 * lam * w
        w -= 0.02 * grad
    exact = (sum(x * y for x, y in zip(xs, ys)) / 3) / (sum(x * x for x in xs) / 3 + lam)
    print(f"lambda={lam:<4} GD w={w:.4f}  closed form w={exact:.4f}")

# convexity: is the chord between any two points above the curve?
import random
random.seed(0)
def looks_convex(f, lo=-3, hi=3, trials=2000):
    for _ in range(trials):
        a, b, t = random.uniform(lo, hi), random.uniform(lo, hi), random.random()
        if f(t * a + (1 - t) * b) > t * f(a) + (1 - t) * f(b) + 1e-12:
            return False
    return True
print("x^2 convex:", looks_convex(lambda x: x * x))
print("|x| convex:", looks_convex(abs))
print("x^4 - 3x^2 convex:", looks_convex(lambda x: x ** 4 - 3 * x * x))
` },
      { lang: 'python', title: 'Regularisation in PyTorch (shown, not run here)', code: `import torch

model = torch.nn.Sequential(
    torch.nn.Linear(100, 256), torch.nn.ReLU(),
    torch.nn.Dropout(p=0.1),                      # dropout: active in model.train(), off in model.eval()
    torch.nn.Linear(256, 10))

# weight decay on weights only, not on biases (a common recipe)
decay = [p for n, p in model.named_parameters() if n.endswith("weight")]
no_decay = [p for n, p in model.named_parameters() if n.endswith("bias")]
opt = torch.optim.AdamW([{"params": decay, "weight_decay": 0.01},
                         {"params": no_decay, "weight_decay": 0.0}], lr=1e-3)

# an explicit L2 penalty, if you want it in the loss instead
def l2_penalty(m, lam=1e-4):
    return lam * sum((p ** 2).sum() for p in m.parameters())

# early stopping skeleton
best, patience, bad = float("inf"), 3, 0
for epoch in range(100):
    val_loss = 1.0 / (epoch + 1)                  # stand-in for a real validation loop
    if val_loss < best:
        best, bad = val_loss, 0
        torch.save(model.state_dict(), "best.pt")  # keep the best checkpoint
    else:
        bad += 1
        if bad >= patience:
            break
` }
    ],
    codeTitle: ['Ridge polynomial', 'Weight decay + convexity', 'PyTorch'],
    viz: {
      title: 'Turning up λ: from memorising noise to a smooth fit',
      input: '0 0.0001 0.001 0.01 0.1 1',
      inputLabel: 'λ values to try (degree-7 polynomial, 9 noisy training points)',
      gen: function (input) {
        var lams = nums(input, 'the λ values', 8);
        if (lams.length < 3) throw new Error('Give at least 3 λ values, e.g. 0 0.001 0.1 1');
        if (lams.some(function (l) { return l < 0 || l > 100; })) throw new Error('λ must be between 0 and 100');
        var D = 7, xt = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1], noise = [0.15, -0.2, 0.1, 0.2, -0.15, 0.1, -0.2, 0.15, -0.1];
        var yt = xt.map(function (x, i) { return Math.sin(Math.PI * x) + noise[i]; });
        var xv = [-0.875, -0.625, -0.375, -0.125, 0.125, 0.375, 0.625, 0.875], yv = xv.map(function (x) { return Math.sin(Math.PI * x); });
        var feats = function (x) { var f = []; for (var d = 0; d <= D; d++) f.push(Math.pow(x, d)); return f; };
        var pred = function (w, x) { return feats(x).reduce(function (a, f, j) { return a + f * w[j]; }, 0); };
        var mse = function (w, xs, ys) { return xs.reduce(function (s, x, i) { var e = pred(w, x) - ys[i]; return s + e * e; }, 0) / xs.length; };
        var fit = function (lam) {
          var X = xt.map(feats), n = X.length, A = [], b = [];
          for (var i = 0; i <= D; i++) {
            A.push([]); b.push(0);
            for (var j = 0; j <= D; j++) { var s = 0; for (var k = 0; k < n; k++) s += X[k][i] * X[k][j]; A[i].push(s / n + (i === j && i > 0 ? lam : 0)); }
            for (var k2 = 0; k2 < n; k2++) b[i] += X[k2][i] * yt[k2] / n;
          }
          return ridgeSolve(A, b);
        };
        var F = [], tr = [], va = [], rows = [];
        F.push({ narr: 'Training data: 9 points from a sine wave <b>plus noise</b>. The model is a degree-7 polynomial (8 weights): flexible enough to wiggle through almost every noisy point. Validation points sit in between and have no noise. We fit with loss = MSE + λ·Σw² for several λ.', parts: [
          { type: 'bars', label: 'training targets y (noisy)', values: yt.map(r3), idxLabels: xt.map(String) },
          { type: 'bars', label: 'validation targets (true curve)', values: yv.map(r3), idxLabels: xv.map(String) }] });
        lams.forEach(function (lam, i) {
          var w = fit(lam), a = mse(w, xt, yt), v = mse(w, xv, yv), norm = Math.sqrt(w.reduce(function (s, q) { return s + q * q; }, 0));
          tr.push(r4(a)); va.push(r4(v)); rows.push([lam, r4(a), r4(v), r3(norm)]);
          F.push({ narr: 'λ = <b>' + lam + '</b>: train MSE ' + r4(a) + ', validation MSE ' + r4(v) + ', weight size ‖w‖ = ' + r3(norm) + '. ' + (lam === 0 ? 'No penalty: huge weights let the curve chase the noise. Low train error, but worse between the points.' : v > a * 3 && norm > 5 ? 'Still wiggly.' : a > 0.1 ? 'The penalty is so strong the curve is flattened: <span class="c-y">underfitting</span>, both errors high.' : 'The penalty shrinks the weights and smooths the curve.'), parts: [
            { type: 'bars', label: 'fitted weights w0..w7', values: w.map(r3), idxLabels: w.map(function (_, j) { return 'w' + j; }) },
            { type: 'table', label: 'results so far', columns: ['λ', 'train MSE', 'val MSE', '‖w‖'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[i] = 'cur'; return o; })() }] });
        });
        var best = 0; va.forEach(function (v, i) { if (v < va[best]) best = i; });
        var hb = {}; hb[best] = 'ok';
        F.push({ narr: 'The pattern: training error only goes <b>up</b> as λ grows (less freedom to fit noise). Validation error dips and rises again: the best λ here is <b>' + lams[best] + '</b>. This U-shape is the bias–variance trade-off, and it is why λ is picked on validation data, never on training data.', parts: [
          { type: 'bars', label: 'train MSE per λ', values: tr, idxLabels: lams.map(String) },
          { type: 'bars', label: 'validation MSE per λ', values: va, idxLabels: lams.map(String), hl: hb }] });
        return F;
      }
    },
    examples: [
      { title: 'Reading learning curves', html: `<p>Epochs 1–10: train loss 2.1 → 0.4, validation 2.2 → 0.6. Epochs 10–30: train 0.4 → 0.05, validation 0.6 → 0.9. The gap opening after epoch 10 is overfitting. With early stopping (patience 3) you would stop around epoch 13 and restore the epoch-10 checkpoint.</p>` },
      { title: 'L1 vs L2 on one weight', html: `<p>Data gradient pulls w towards 0.3; λ = 0.5. L2 adds 2λw = w, so the optimum solves 2(w − 0.3) + w = 0 → w = <b>0.2</b>: shrunk but not zero. L1 adds λ·sign(w) = 0.5: 2(w − 0.3) + 0.5 = 0 → w = 0.05, and with a slightly larger λ (≥ 0.6) the optimum is <b>exactly 0</b>. L1 removes weak features entirely; L2 keeps everything small.</p>` },
      { title: 'Dropout arithmetic', html: `<p>Dropout p = 0.5 on 4 activations [2, 4, 6, 8]: a random mask [1, 0, 1, 0] gives [2, 0, 6, 0], then "inverted dropout" multiplies by 1/(1 − p) = 2 → [4, 0, 12, 0], so the expected value of each activation stays the same. At test time dropout is switched off (<code>model.eval()</code>) and nothing is scaled.</p>` },
      { title: 'Convex or not?', html: `<p>f(w) = (w − 2)² + 0.1w²: f″ = 2.2 &gt; 0, convex, one minimum at w = 2/1.1 ≈ 1.818. g(w) = sin(w) + 0.1w²: g″ = −sin(w) + 0.2 is negative near w = π/2, so not convex: gradient descent from different starts can end in different valleys. A one-hidden-layer network's loss already has this property: swapping two hidden neurons gives the same loss, so minima come in symmetric copies.</p>` }
    ],
    deepDive: `<p><b>🟣 Bias and variance.</b> Expected test error = bias² (systematic error from a too-simple model) + variance (sensitivity to the particular training sample) + irreducible noise. Regularisation trades a little bias for a big drop in variance. Classical theory says error is U-shaped in model size; modern deep learning shows <b>double descent</b>: past the point where the model can fit the training set exactly, test error can fall again as models grow, because SGD with large models finds smooth, low-norm interpolating solutions. Regularisation and data still matter, but "bigger model = more overfitting" is not a reliable rule any more.</p>
      <p><b>L2 as a prior, and the closed form.</b> L2 regularisation equals assuming each weight comes from a Gaussian centred at 0 (MAP estimation, see the probability module); L1 corresponds to a Laplace prior. Ridge regression has the closed form w = (XᵀX + nλI)⁻¹Xᵀy. Adding λI also fixes the singular-matrix problem from linear algebra: XᵀX + nλI is always invertible for λ &gt; 0.</p>
      <p><b>Weight decay vs L2.</b> For plain SGD, adding λ‖w‖²/2 to the loss and multiplying weights by (1 − lr·λ) each step are identical. For Adam they are not, because the L2 gradient gets rescaled by 1/√v̂; that difference is exactly why AdamW exists (see the practice problem comparing them).</p>
      <p><b>Convexity in more detail.</b> A twice-differentiable function of many variables is convex when its Hessian is positive semi-definite everywhere (all eigenvalues ≥ 0). Strong convexity (eigenvalues ≥ μ &gt; 0) gives a unique minimum and linear convergence for GD. Sums of convex functions are convex, which is why "convex loss + L2" stays convex. Neural networks break convexity through products of weights across layers (and symmetries such as swapping neurons), yet overparameterised networks trained with SGD reliably reach low training loss; flat, wide minima tend to generalise better than sharp ones.</p>`,
    aiEra: `<p><b>🤖 Where you meet this in AI work.</b> LLM pre-training rarely overfits in the classic sense (each token is seen about once), so weight decay there is more about optimisation stability. <b>Fine-tuning</b> is where overfitting bites: a few thousand examples and several epochs can make a model parrot its training set and forget general skills. Remedies: fewer epochs, lower lr, LoRA (a low-rank, implicitly regularised update), dropout in the adapters, a held-out evaluation set, and early stopping on that set.</p>
      <p><b>Working with AI assistants.</b> Check that generated training code computes validation metrics with <code>model.eval()</code> and <code>torch.no_grad()</code>, that the validation split is truly separate (no duplicates or leakage between train and test, a very common silent bug), and that hyperparameters such as λ were chosen on validation, not test data. If an assistant reports suspiciously high test accuracy, ask it to look for leakage first.</p>`,
    problems: [
      PR('ridge', {
        title: 'Ridge Regression by Gradient Descent', level: 'Medium', tags: ['regularisation', 'L2', 'gradient descent'], companies: ['Amazon', 'Netflix'],
        statement: `<p>Fit a single weight w (no bias) to points (xs[i], ys[i]) by minimising <code>L(w) = mean((w·x − y)²) + λ·w²</code>. Write <code>ridge_gd(xs, ys, lam, lr, steps)</code> that starts at w = 0, runs <code>steps</code> gradient-descent updates with learning rate lr, and returns w.</p>`,
        constraints: `<p>1 ≤ n ≤ 10<sup>4</sup>, 0 ≤ λ ≤ 100, lr is small enough to converge, 0 ≤ steps ≤ 10<sup>4</sup>. Compared with a small tolerance.</p>`,
        example: `<p><code>xs = [1, 2, 3], ys = [2, 4, 6], λ = 1, lr = 0.05, steps = 200</code> → <code class="c-g">1.6471</code>. Why: the minimum satisfies mean(2(wx − y)x) + 2λw = 0, so w = mean(xy) / (mean(x²) + λ) = 9.333 / 5.667 = 1.647. With λ = 0 the answer is 2.</p>`,
        bruteWhy: `<p>One could try many w values on a grid and keep the one with the smallest loss. That is slow and only as precise as the grid. Gradient descent (or the closed form) gets there directly, and gradient descent generalises to millions of weights where the grid is hopeless.</p>`,
        mcq: { q: `What does the L2 term add to the gradient?`, options: ['2λw: a pull towards zero proportional to w', 'λ: a constant push', 'λ·sign(w)', 'nothing, it only changes the loss value'], answer: 0, explain: `d(λw²)/dw = 2λw. Big weights are pulled back hard, small weights gently. (λ·sign(w) is the L1 gradient.)` },
        hints: [
          `Hint 1: The total gradient is the data part plus the penalty part. Compute them separately to keep it readable.`,
          `Hint 2: Data part: mean over points of 2(w·x − y)·x. Penalty part: 2·λ·w.`,
          `Hint 3: Loop steps times: w -= lr * (data_grad + 2 * lam * w). With steps = 0 return 0.0. Check against the closed form mean(xy)/(mean(x²) + λ).`
        ],
        approach: `<p>Plain gradient descent on the regularised loss. Each step computes the mean data gradient over all points and adds 2λw, then moves against the sum. The result approaches mean(xy)/(mean(x²) + λ), which shrinks towards 0 as λ grows.</p>`,
        dry: { head: ['step', 'w', 'data grad', '2λw (λ = 1)', 'new w (lr 0.05)'], rows: [['1', '0', '−18.667', '0', '0.9333'], ['2', '0.9333', '−9.956', '1.867', '1.338'], ['…', '…', '…', '…', '→ 1.647']] },
        complexity: `<p>O(steps × n) time, O(1) extra space.</p>`,
        followUps: ['Derive the closed form and compare it with your GD answer.', 'Change the penalty to L1. Why can the answer become exactly 0?']
      })
    ]
  });

  // ===================== PRACTICE: EASY =====================
  practice.push(PR('numder', {
    title: 'Central-Difference Numeric Derivative', level: 'Easy', tags: ['derivatives', 'numerics'], companies: ['Google', 'Jane Street'],
    statement: `<p>A polynomial is given by <code>coeffs</code> (coeffs[i] multiplies x<sup>i</sup>). Write <code>numeric_derivative(coeffs, x, h)</code> that estimates f′(x) with the central difference <code>(f(x + h) − f(x − h)) / (2h)</code>. Do not use the power rule.</p>`,
    constraints: `<p>1 ≤ len(coeffs) ≤ 10, |x| ≤ 100, 10<sup>−6</sup> ≤ h ≤ 1. Compared with a small tolerance against the exact central-difference value.</p>`,
    example: `<p><code>coeffs = [0, 0, 0, 1]</code> (f = x³), x = 2, h = 0.1 → <code class="c-g">12.01</code>. Why: f(2.1) = 9.261, f(1.9) = 6.859, difference 2.402, divided by 0.2 = 12.01. The exact slope is 12; the error h² = 0.01 is the central difference's typical size for a cubic.</p>`,
    bruteWhy: `<p>The one-sided forward difference (f(x + h) − f(x)) / h is simpler but its error shrinks only like h: for x³ at 2 with h = 0.1 it gives 12.61, an error of 0.61 versus 0.01.</p>`,
    mcq: { q: `For f(x) = x² (any x), how accurate is the central difference?`, options: ['exact for every h', 'error about h', 'error about h²', 'it only works for small h'], answer: 0, explain: `((x + h)² − (x − h)²) / 2h = 4xh / 2h = 2x exactly. The central difference is exact for polynomials of degree ≤ 2, because its error term involves f‴.` },
    hints: [
      `Hint 1: First write a helper f(t) that evaluates the polynomial: sum of c·t**i.`,
      `Hint 2: Evaluate it at x + h and x − h, subtract, divide by 2h.`,
      `Hint 3: A constant polynomial gives 0; a straight line gives its slope exactly for any h. Use those as sanity checks.`
    ],
    approach: `<p>Evaluate the polynomial at x ± h and take the symmetric slope. The odd-power error terms cancel, leaving an error of about h²·f‴(x)/6.</p>`,
    complexity: `<p>O(n) per evaluation (two evaluations), O(1) extra space.</p>`,
    followUps: ['Plot the error against h on a log scale. Where does round-off take over?', 'How would you extend this to a gradient of a function of many variables?']
  }));

  practice.push(PR('sigd', {
    title: 'Sigmoid Derivative Without Overflow', level: 'Easy', tags: ['activations', 'derivatives', 'numerical stability'], companies: ['Meta', 'Apple'],
    statement: `<p>Write <code>sigmoid_derivative(z)</code> returning σ′(z) = σ(z)(1 − σ(z)), where σ(z) = 1/(1 + e<sup>−z</sup>). It must work for very large positive and negative z (for example ±800) without raising an overflow error.</p>`,
    constraints: `<p>|z| ≤ 10<sup>4</sup>. Compared with a small tolerance.</p>`,
    example: `<p><code>z = 0</code> → <code class="c-g">0.25</code> (σ = 0.5, 0.5 × 0.5). <code>z = 2</code> → 0.105. <code>z = −800</code> → <code class="c-y">0.0</code> (the curve is completely flat that far out).</p>`,
    bruteWhy: `<p>The textbook formula e<sup>−z</sup>/(1 + e<sup>−z</sup>)² calls math.exp(800) for z = −800, which raises OverflowError in Python (and gives inf/NaN in NumPy). Computing σ in a numerically safe way first avoids it.</p>`,
    mcq: { q: `What is the largest value σ′(z) can take?`, options: ['0.25, at z = 0', '1, at z = 0', '0.5, at z = 0', 'it grows without limit'], answer: 0, explain: `σ(1 − σ) is a product of two numbers that add up to 1, largest when both are 0.5. This 0.25 cap is one cause of vanishing gradients in deep sigmoid networks.` },
    hints: [
      `Hint 1: Use the shortcut σ′ = σ(1 − σ): you only need σ itself.`,
      `Hint 2: For z ≥ 0 compute 1/(1 + exp(−z)) (exp of a negative number is safe). For z &lt; 0 use exp(z)/(1 + exp(z)).`,
      `Hint 3: Both branches give the same σ mathematically; only the safe one is used. Then return s * (1 − s).`
    ],
    approach: `<p>Compute σ(z) with the branch that only ever exponentiates a non-positive number, then return σ(1 − σ). The result underflows gracefully to 0 for huge |z|.</p>`,
    complexity: `<p>O(1) time and space: one exponential and a few arithmetic operations.</p>`,
    followUps: ['What is the derivative of tanh, and how does it relate to σ?', 'Why do frameworks offer a fused log-sigmoid function?']
  }));

  practice.push(PR('mse', {
    title: 'Mean Squared Error', level: 'Easy', tags: ['loss functions', 'MSE'], companies: ['Amazon', 'Uber'],
    statement: `<p>Write <code>mse(y_true, y_pred)</code> returning the mean of the squared differences between predictions and targets.</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>6</sup>, both lists have the same length. Compared with a small tolerance.</p>`,
    example: `<p><code>y_true = [1, 2, 3], y_pred = [2, 2, 5]</code> → <code class="c-g">1.6667</code>. Why: differences 1, 0, 2; squares 1, 0, 4; mean 5/3.</p>`,
    bruteWhy: `<p>A common mistake is averaging the plain differences (they cancel: +1 and −1 average to 0) or forgetting to divide by n (that is the sum of squared errors, which grows with the dataset and changes the effective learning rate).</p>`,
    mcq: { q: `Predictions [0, 0] vs targets [3, −3]. MSE?`, options: ['9', '0', '6', '18'], answer: 0, explain: `Squares 9 and 9, mean 9. The plain average error would be 0, which is why we square.` },
    hints: [
      `Hint 1: Pair the lists with zip and work slot by slot.`,
      `Hint 2: Square each difference so positive and negative errors cannot cancel.`,
      `Hint 3: Sum the squares and divide by n. A perfect prediction must give exactly 0.`
    ],
    approach: `<p>One pass: sum (p − t)² over the pairs, divide by n.</p>`,
    complexity: `<p>O(n) time, O(1) extra space.</p>`,
    followUps: ['What is RMSE and why do people report it?', 'When would you prefer the mean absolute error?']
  }));

  practice.push(PR('bce', {
    title: 'Binary Cross-Entropy With Clipping', level: 'Easy', tags: ['loss functions', 'cross-entropy', 'classification'], companies: ['Google', 'Stripe'],
    statement: `<p>Write <code>binary_cross_entropy(y_true, p)</code> returning the mean of −[y·ln q + (1 − y)·ln(1 − q)], where q is p clipped to the range [10<sup>−12</sup>, 1 − 10<sup>−12</sup>] so the log never sees 0.</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>6</sup>. Labels are 0 or 1, 0 ≤ p ≤ 1. Compared with a small tolerance.</p>`,
    example: `<p><code>y = [1, 0, 1], p = [0.8, 0.2, 0.6]</code> → <code class="c-g">0.3190</code>. Why: losses −ln 0.8 = 0.223, −ln(1 − 0.2) = 0.223, −ln 0.6 = 0.511; mean 0.319.</p>
      <p><code>y = [1], p = [0.0]</code> → <code class="c-r">27.631</code> = −ln(10<sup>−12</sup>): very wrong and very confident, but finite thanks to clipping.</p>`,
    bruteWhy: `<p>Without clipping, p = 0 with y = 1 calls math.log(0), which raises an error in Python (−inf in NumPy, then NaN after averaging). One bad prediction would crash training or poison the loss.</p>`,
    mcq: { q: `The true label is 0 and the model says p = 0.9. What is that example's loss?`, options: ['−ln 0.1 ≈ 2.303', '−ln 0.9 ≈ 0.105', '0.81', '0.9'], answer: 0, explain: `With y = 0 only the (1 − y)·ln(1 − p) term is active: −ln(1 − 0.9) = −ln 0.1.` },
    hints: [
      `Hint 1: Only one of the two terms is non-zero per example, depending on y.`,
      `Hint 2: Clip first: q = min(max(p, eps), 1 − eps) with eps = 1e-12.`,
      `Hint 3: Accumulate −(y·log q + (1 − y)·log(1 − q)) and divide by n. Perfect predictions (p = y) give about 0.`
    ],
    approach: `<p>Clip each probability away from 0 and 1, add the per-example negative log-likelihood, and average. In real frameworks you avoid probabilities entirely and compute from logits (BCEWithLogitsLoss), which is more accurate still.</p>`,
    complexity: `<p>O(n) time, O(1) extra space.</p>`,
    followUps: ['Rewrite it to take logits z instead of probabilities, without ever computing σ(z).', 'What loss does a model that always predicts 0.5 get?']
  }));

  practice.push(PR('early', {
    title: 'Early Stopping: Which Checkpoint Do You Keep?', level: 'Easy', tags: ['overfitting', 'early stopping'], companies: ['Microsoft', 'Hugging Face'],
    statement: `<p>You train epoch by epoch and record validation losses in <code>val_losses</code>. Early stopping with <code>patience</code> means: keep track of the best (strictly lowest) loss so far; if <code>patience</code> epochs in a row bring no new best, stop training. Write <code>early_stopping_epoch(val_losses, patience)</code> that returns the index of the best epoch seen before stopping (the checkpoint you would restore).</p>`,
    constraints: `<p>1 ≤ len ≤ 10<sup>5</sup>, patience ≥ 1. A loss equal to the best is <i>not</i> an improvement.</p>`,
    example: `<p><code>[1.0, 0.8, 0.6, 0.65, 0.7, 0.5]</code>, patience 2 → <code class="c-g">2</code>. Why: best 0.6 at epoch 2; epochs 3 and 4 do not improve, so training stops after epoch 4 and never sees the 0.5. With patience 3 it reaches epoch 5 and returns <code class="c-b">5</code>.</p>`,
    bruteWhy: `<p>Simply returning the index of the minimum over the whole list ignores that training would have stopped earlier. In the example that gives 5, a checkpoint that was never trained with patience 2.</p>`,
    mcq: { q: `Why do we restore the best checkpoint instead of keeping the last weights?`, options: ['The last patience epochs were already overfitting (or not improving)', 'The last weights are always NaN', 'It makes training faster', 'Because the training loss is lower there'], answer: 0, explain: `By definition the final weights came after several epochs without validation improvement. The best-validation weights are our best guess for new data.` },
    hints: [
      `Hint 1: Walk through the epochs once, keeping best value, best epoch and a "waited" counter.`,
      `Hint 2: New strict best → update and reset the counter. Otherwise increment it; if it reaches patience, stop.`,
      `Hint 3: Return best_epoch. A single-epoch list returns 0; a list that never improves after epoch 0 returns 0.`
    ],
    approach: `<p>Simulate the training loop: track the best loss and how many epochs have passed since it. Stop when that count hits the patience and report where the best was.</p>`,
    complexity: `<p>O(n) time, O(1) space.</p>`,
    followUps: ['How would you add a minimum improvement threshold (min_delta)?', 'Why is early stopping a form of regularisation?']
  }));

  // ===================== PRACTICE: MEDIUM =====================
  practice.push(PR('smce', {
    title: 'Softmax Cross-Entropy Gradient', level: 'Medium', tags: ['softmax', 'cross-entropy', 'gradients'], companies: ['OpenAI', 'Anthropic', 'Google DeepMind'],
    statement: `<p>Given raw scores <code>logits</code> for K classes and the index of the correct class <code>target</code>, the loss is L = −ln softmax(logits)[target]. Write <code>softmax_ce_grad(logits, target)</code> returning the gradient ∂L/∂logits as a list of K numbers. It must handle huge logits such as 1000 without overflow.</p>`,
    constraints: `<p>1 ≤ K ≤ 10<sup>5</sup>, |logit| ≤ 10<sup>4</sup>, 0 ≤ target &lt; K. Compared with a small tolerance.</p>`,
    example: `<p><code>logits = [2, 1, 0.1], target = 0</code> → <code class="c-g">[−0.341, 0.2424, 0.0986]</code>. Why: softmax = [0.659, 0.2424, 0.0986]; subtract 1 at the target. The entries always sum to 0.</p>`,
    bruteWhy: `<p>The numeric gradient nudges each logit up and down and recomputes the loss: 2K full softmaxes. For a 100k-token vocabulary that is 200k softmaxes per example, versus one for the analytic p − one_hot.</p>`,
    mcq: { q: `All logits are equal and K = 4, target = 3. What is the gradient?`, options: ['[0.25, 0.25, 0.25, −0.75]', '[0, 0, 0, 0]', '[0.25, 0.25, 0.25, 0.25]', '[0, 0, 0, −1]'], answer: 0, explain: `Softmax of equal logits is uniform, 0.25 each. Subtract 1 at the target: the correct class is pushed up by 0.75, each other class down by 0.25.` },
    hints: [
      `Hint 1: Do the calculus once: for softmax + cross-entropy, ∂L/∂zᵢ = pᵢ − [i == target].`,
      `Hint 2: Compute softmax safely: subtract max(logits) before exponentiating, then normalise.`,
      `Hint 3: Return [p − (1 if i == target else 0) for each i]. With K = 1 the gradient is [0.0]: one class is always right.`
    ],
    approach: `<p>Stable softmax (max-shift), then subtract the one-hot target. The log in cross-entropy cancels the exponential in softmax, leaving this simple form, which is also what <code>F.cross_entropy</code> computes in its backward pass.</p>`,
    complexity: `<p>O(K) time and O(K) space for the output.</p>`,
    followUps: ['Return the loss as well, using log-sum-exp.', 'How does label smoothing change the gradient?']
  }));

  practice.push(PR('mom', {
    title: 'Gradient Descent With Momentum', level: 'Medium', tags: ['optimisers', 'momentum'], companies: ['NVIDIA', 'Tesla'],
    statement: `<p>Minimise f(x) = ½·a·x² (gradient a·x) using heavy-ball momentum in the PyTorch form: <code>v ← β·v + g</code>, then <code>x ← x − lr·v</code>, with v starting at 0. Write <code>momentum_descent(a, x0, lr, beta, n)</code> returning x after n steps.</p>`,
    constraints: `<p>a &gt; 0, 0 ≤ β &lt; 1, 0 ≤ n ≤ 10<sup>5</sup>. Parameters are chosen so values stay finite. Compared with a small tolerance.</p>`,
    example: `<p><code>a = 2, x0 = −3, lr = 0.1, β = 0.9, n = 1</code> → <code class="c-g">−2.4</code>. Why: g = 2·(−3) = −6, v = −6, x = −3 − 0.1·(−6) = −2.4. With β = 0 the method is plain gradient descent: <code>a = 1, x0 = 10, lr = 0.1, n = 10</code> gives 10·0.9<sup>10</sup> ≈ 3.487.</p>`,
    bruteWhy: `<p>Plain gradient descent (β = 0) is the baseline. On this 1-D bowl both converge, but momentum can overshoot: with lr = 0.1 and β = 0.9 it swings past 0 to about −5.89 after 10 steps before settling, while on stretched multi-dimensional valleys it is much faster overall.</p>`,
    mcq: { q: `With a constant gradient g, what does the velocity v approach for β = 0.9?`, options: ['10·g', 'g', '0.9·g', '0.1·g'], answer: 0, explain: `v = g(1 + β + β² + …) = g/(1 − β) = 10g. Momentum multiplies the effective step on consistent slopes.` },
    hints: [
      `Hint 1: Keep two state variables: position x and velocity v (start v = 0).`,
      `Hint 2: Each step: g = a·x, v = β·v + g, x = x − lr·v. Order matters: update v before x.`,
      `Hint 3: n = 0 returns x0. β = 0 must reproduce plain gradient descent exactly; test that first.`
    ],
    approach: `<p>Simulate the two-variable recurrence. The velocity is a decaying sum of past gradients, so consistent directions accelerate and oscillating ones partly cancel.</p>`,
    complexity: `<p>O(n) time, O(1) space.</p>`,
    followUps: ['Implement Nesterov momentum (gradient at the look-ahead point).', 'For which β does this 1-D problem converge fastest with lr = 0.1, a = 1?']
  }));

  practice.push(PR('steps', {
    title: 'Pick a Learning Rate: Steps to Converge', level: 'Medium', tags: ['gradient descent', 'learning rate', 'convergence'], companies: ['Google', 'Amazon'],
    statement: `<p>Gradient descent on f(x) = a·x² from x0. Write <code>steps_to_converge(a, lr, x0, tol, max_steps)</code> returning the number of updates needed until |x| &lt; tol (0 if it already holds), or −1 if that does not happen within max_steps updates or if |x| exceeds 10<sup>12</sup> (diverged).</p>`,
    constraints: `<p>a &gt; 0, lr &gt; 0, tol &gt; 0, 0 ≤ max_steps ≤ 10<sup>6</sup>.</p>`,
    example: `<p><code>a = 1, lr = 0.1, x0 = 1, tol = 0.001</code> → <code class="c-g">31</code>. Why: each step multiplies x by 1 − 2·a·lr = 0.8, and 0.8<sup>31</sup> ≈ 0.00099 &lt; 0.001 (0.8<sup>30</sup> ≈ 0.00124 is not).</p>
      <p>lr = 0.5 → <code class="c-b">1</code> (factor 0). lr = 1.0 → <code class="c-r">−1</code> (factor −1: bounces forever). lr = 0.9 → 31 as well (factor −0.8: zig-zags but converges).</p>`,
    bruteWhy: `<p>Just looping max_steps times without a divergence check works but wastes time on runs that exploded long ago and may overflow to inf. A cheaper exact approach: the factor r = 1 − 2a·lr tells you the answer in advance (|r| ≥ 1 never converges; otherwise about log(tol/|x0|)/log|r| steps).</p>`,
    mcq: { q: `For f(x) = a·x², which learning rates converge?`, options: ['0 &lt; lr &lt; 1/a', '0 &lt; lr &lt; 2/a', 'any lr &gt; 0', '0 &lt; lr &lt; 1/(2a)'], answer: 0, explain: `The factor is 1 − 2a·lr; |1 − 2a·lr| &lt; 1 ⇔ 0 &lt; lr &lt; 1/a. (In curvature terms f″ = 2a, so lr &lt; 2/f″.) lr = 1/(2a) is the fastest, not the limit.` },
    hints: [
      `Hint 1: Check |x| &lt; tol before each update, so an x0 already inside returns 0.`,
      `Hint 2: The update is x ← x − lr·2a·x. Count updates in a loop of at most max_steps.`,
      `Hint 3: Bail out with −1 when |x| &gt; 1e12 (diverging) or when the budget runs out. Factor exactly −1 never gets closer: −1.`
    ],
    approach: `<p>Simulate with a step counter and two exits: success when |x| &lt; tol, failure on divergence or budget exhaustion. The analysis says convergence happens exactly when |1 − 2a·lr| &lt; 1, and speed depends on how small that factor is.</p>`,
    complexity: `<p>O(min(answer, max_steps)) time, O(1) space.</p>`,
    followUps: ['Compute the answer in O(1) with logarithms. Watch out for floating-point edge cases.', 'For f(x, y) = x² + 10y², which single lr minimises the steps?']
  }));

  practice.push(PR('linreg', {
    title: 'Linear Regression by Gradient Descent', level: 'Medium', tags: ['linear regression', 'gradient descent', 'MSE'], companies: ['Amazon', 'Airbnb'],
    statement: `<p>Fit y ≈ w·x + b by full-batch gradient descent on the mean squared error. Start from w = b = 0 and run <code>steps</code> updates with learning rate lr, updating w and b <b>simultaneously</b> (both gradients computed from the old values). Write <code>linear_regression_gd(xs, ys, lr, steps)</code> returning <code>[w, b]</code>.</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>4</sup>, lr small enough to converge, 0 ≤ steps ≤ 10<sup>4</sup>. Compared with a small tolerance.</p>`,
    example: `<p><code>xs = [1, 2, 3, 4], ys = [3, 5, 7, 9], lr = 0.05, steps = 2000</code> → <code class="c-g">[2.0, 1.0]</code> (the data is exactly y = 2x + 1).</p>
      <p>After 1 step: errors are −y, so dw = 2·mean(−y·x) = −35, db = 2·mean(−y) = −12; w = 1.75, b = 0.6.</p>`,
    bruteWhy: `<p>Updating w first and then using the new w to compute b's gradient ("sequential" updates) is a common slip: it is a different algorithm and gives different numbers. The closed-form least-squares answer is fine for one feature but needs a matrix inverse with many, and does not extend to non-linear models.</p>`,
    mcq: { q: `Why does the bias need its own gradient?`, options: ['Without it the line must pass through the origin', 'It makes the loss convex', 'It is required for the learning rate', 'It reduces overfitting'], answer: 0, explain: `With b fixed at 0, the best line y = w·x is forced through (0, 0). The bias lets the line shift up and down; its gradient is 2·mean(error).` },
    hints: [
      `Hint 1: Each step: compute all errors e = w·x + b − y with the current w and b.`,
      `Hint 2: dw = mean(2·e·x), db = mean(2·e). Then w -= lr·dw and b -= lr·db.`,
      `Hint 3: Make sure both gradients use the old w and b. steps = 0 returns [0.0, 0.0].`
    ],
    approach: `<p>Repeat: predict, compute errors, average the two chain-rule gradients, step both parameters together. Because the MSE is convex in (w, b), a small enough lr converges to the least-squares line.</p>`,
    complexity: `<p>O(steps × n) time, O(1) extra space.</p>`,
    followUps: ['Standardise x first. Why does it allow a larger learning rate?', 'Switch to mini-batches of size 2 and compare the paths.']
  }));

  practice.push(PR('rosen', {
    title: 'Gradient of the Rosenbrock Valley', level: 'Medium', tags: ['partial derivatives', 'chain rule', 'optimisation benchmarks'], companies: ['Two Sigma', 'Google'],
    statement: `<p>The Rosenbrock function f(x, y) = (1 − x)² + 100·(y − x²)² is a classic test for optimisers: a long, curved, narrow valley with its minimum at (1, 1). Write <code>rosenbrock_gradient(x, y)</code> returning [∂f/∂x, ∂f/∂y].</p>`,
    constraints: `<p>|x|, |y| ≤ 100. Compared with a small tolerance.</p>`,
    example: `<p><code>(1, 1)</code> → <code class="c-g">[0, 0]</code> (the minimum). <code>(2, 1)</code> → <code class="c-r">[2402, −600]</code>. Why: inner = y − x² = −3. ∂f/∂x = −2(1 − 2) + 200·(−3)·(−2·2) = 2 + 2400 = 2402. ∂f/∂y = 200·(−3) = −600.</p>`,
    bruteWhy: `<p>A numeric gradient works but is approximate. The common analytic slip is forgetting the chain-rule factor −2x from the inner x² term: writing 200·(y − x²) for ∂f/∂x gives the wrong sign and size.</p>`,
    mcq: { q: `Why is plain gradient descent slow on Rosenbrock?`, options: ['The valley is narrow and curved: steep walls force a tiny lr, and progress along the floor is slow', 'It has many local minima', 'Its gradient is always zero', 'It is not differentiable'], answer: 0, explain: `The curvature across the valley is huge compared with along it (high condition number), the classic case where momentum and Adam help.` },
    hints: [
      `Hint 1: Treat the two terms separately; the second needs the chain rule through u = y − x².`,
      `Hint 2: d/dx (1 − x)² = −2(1 − x). d/dx 100·u² = 200·u·du/dx with du/dx = −2x.`,
      `Hint 3: ∂f/∂y = 200·(y − x²). Check that (1, 1) gives [0, 0].`
    ],
    approach: `<p>Differentiate term by term with the chain rule: ∂f/∂x = −2(1 − x) − 400x(y − x²), ∂f/∂y = 200(y − x²).</p>`,
    complexity: `<p>O(1) time and space: a handful of multiplications.</p>`,
    followUps: ['Run gradient descent from (−1.5, 2). What lr is stable? How many steps to get near (1, 1)?', 'Compare with momentum and Adam on the same start.']
  }));

  practice.push(PR('sched', {
    title: 'Warm-Up + Cosine Learning-Rate Schedule', level: 'Medium', tags: ['learning rate', 'schedules', 'LLM training'], companies: ['Anthropic', 'Mistral AI', 'Meta'],
    statement: `<p>Write <code>warmup_cosine_lr(step, total_steps, warmup_steps, base_lr, min_lr)</code> (step counts from 0):</p>
      <ul><li>if step &lt; warmup_steps: <code>base_lr · (step + 1) / warmup_steps</code>;</li>
      <li>otherwise progress = (step − warmup_steps) / max(1, total_steps − warmup_steps), capped at 1, and lr = <code>min_lr + ½(base_lr − min_lr)(1 + cos(π·progress))</code>.</li></ul>`,
    constraints: `<p>0 ≤ step, 0 ≤ warmup_steps ≤ total_steps, 0 ≤ min_lr ≤ base_lr. Steps past the end stay at min_lr. Compared with a small tolerance.</p>`,
    example: `<p>total 100, warm-up 10, base 0.001, min 0: step 0 → <code>0.0001</code>; step 9 → <code>0.001</code>; step 55 → <code class="c-g">0.0005</code> (progress 0.5, cos(π/2) = 0); step 100 → 0.</p>`,
    bruteWhy: `<p>Forgetting the cap on progress makes the cosine swing back up after total_steps (cos(1.5π) = 0 → the lr climbs again). Forgetting the +1 in warm-up gives lr = 0 at step 0, wasting a step.</p>`,
    mcq: { q: `Why warm up the learning rate at the start of transformer training?`, options: ['Early gradients and Adam\'s second-moment estimates are unreliable, so large first steps can destabilise training', 'To make training finish sooner', 'Because the loss is convex at the start', 'To save memory'], answer: 0, explain: `At initialisation the gradient statistics change quickly and v̂ is based on few samples. A short ramp avoids huge, badly-scaled early updates.` },
    hints: [
      `Hint 1: Two phases decided by comparing step with warmup_steps.`,
      `Hint 2: Warm-up is linear; decay uses math.cos(math.pi * progress) which goes from 1 to −1.`,
      `Hint 3: Use max(1, total − warmup) to avoid dividing by 0, and min(progress, 1.0) to stay at min_lr after the end. With warmup_steps = 0 there is no warm-up branch at all.`
    ],
    approach: `<p>Piecewise function: a linear ramp, then a half cosine from base_lr down to min_lr. This is the shape used by most LLM pre-training and fine-tuning recipes.</p>`,
    complexity: `<p>O(1) per call: one comparison and at most one cosine.</p>`,
    followUps: ['Implement a linear decay and a warm-up–stable–decay (WSD) schedule.', 'How would you resume training from step 5,000 with the same schedule?']
  }));

  // ===================== PRACTICE: HARD =====================
  practice.push(PR('logreg', {
    title: 'Logistic Regression From Scratch', level: 'Hard', tags: ['logistic regression', 'cross-entropy', 'gradient descent'], companies: ['Stripe', 'PayPal', 'Google'],
    statement: `<p>Train logistic regression p = σ(w·x + b) on rows X (each a list of d features) and labels y ∈ {0, 1} by full-batch gradient descent on the mean binary cross-entropy. Start from all-zero w and b = 0, run <code>steps</code> updates with learning rate lr, and return <code>w + [b]</code> (the d weights followed by the bias).</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>4</sup>, 1 ≤ d ≤ 50, 0 ≤ steps ≤ 10<sup>4</sup>. Compared with a small tolerance, so follow the update rule exactly.</p>`,
    example: `<p><code>X = [[0], [1], [2], [3]], y = [0, 0, 1, 1], lr = 0.5, steps = 1</code> → <code class="c-g">[0.25, 0.0]</code>. Why: at zero weights every p = 0.5, so the errors p − y are [0.5, 0.5, −0.5, −0.5]. ∂/∂w = mean(err·x) = (0 + 0.5 − 1 − 1.5)/4 = −0.5; ∂/∂b = mean(err) = 0. Step: w = 0.25, b = 0.</p>`,
    bruteWhy: `<p>Using MSE on the probabilities instead of cross-entropy also "learns", but its gradient has an extra p(1 − p) factor that vanishes when predictions are confidently wrong, so it trains slowly and gives different numbers. The correct gradient for sigmoid + BCE is simply (p − y)·x.</p>`,
    mcq: { q: `For perfectly separable data, what happens to ‖w‖ if you train logistic regression without regularisation for ever?`, options: ['It keeps growing: making predictions ever more confident keeps lowering the loss', 'It converges to a finite value', 'It shrinks to 0', 'It oscillates'], answer: 0, explain: `On separable data the loss can always be reduced by scaling w up, so there is no finite minimiser. L2 regularisation or early stopping fixes this.` },
    hints: [
      `Hint 1: Per step: for each row compute z = w·x + b, p = σ(z), err = p − y.`,
      `Hint 2: Gradients: g_w[j] = mean(err·x[j]), g_b = mean(err). Use a stable sigmoid so large |z| does not overflow.`,
      `Hint 3: Update all weights and the bias at once after the pass over the data. Return w + [b]; steps = 0 returns zeros.`
    ],
    approach: `<p>Batch gradient descent with the p − y gradient. The loss is convex in (w, b), so the path is well-behaved for a reasonable lr; with separable data the weights keep growing slowly, which the tests capture after a fixed number of steps.</p>`,
    complexity: `<p>O(steps × n × d) time, O(d) extra space.</p>`,
    followUps: ['Add L2 regularisation and show that w stays bounded on separable data.', 'Extend to K classes with softmax (multinomial logistic regression).']
  }));

  practice.push(PR('gcheck', {
    title: 'Numerical Gradient Check for a Tiny Network', level: 'Hard', tags: ['gradient check', 'backpropagation', 'testing'], companies: ['OpenAI', 'Anthropic', 'NVIDIA'],
    statement: `<p>Same network as the backprop lesson: h = σ(W1·x + b1), ŷ = w2·h + b2, L = ½(ŷ − y)². Write <code>numeric_gradient_check(x, y, W1, b1, w2, b2)</code> that computes the gradient of L with respect to every parameter <b>using only central differences</b> (ε = 10<sup>−5</sup>, no calculus), in the order dW1 row by row, then db1, dw2, db2. The tests compare your numbers with the exact backprop gradients, so a correct numeric check must agree to about 10<sup>−6</sup>.</p>`,
    constraints: `<p>1 ≤ D, H ≤ 8, |values| ≤ 5. Compared with a small tolerance.</p>`,
    example: `<p><code>x = [1, 2], y = 1, W1 = [[0.1, 0.2], [−0.3, 0.4]], b1 = [0, 0], w2 = [0.5, −0.5], b2 = 0</code> → <code class="c-g">[−0.1175, −0.2350, 0.1175, 0.2350, −0.1175, 0.1175, −0.6225, −0.6225, −1.0]</code>, exactly the backprop answer without its leading loss value.</p>`,
    bruteWhy: `<p>The one-sided difference (L(θ + ε) − L(θ))/ε has error about ε·L″/2 ≈ 10<sup>−6</sup> to 10<sup>−5</sup>, too large to tell a subtle bug from noise. The central difference's error is about ε², around 10<sup>−10</sup>.</p>`,
    mcq: { q: `Your gradient check reports a relative error of 0.3 for every weight in one layer and 10⁻¹⁰ for all others. Most likely cause?`, options: ['A bug in that layer\'s backward formula (e.g. a missing activation slope or a transpose)', 'ε is too small', 'float64 is not precise enough', 'The network is too small'], answer: 0, explain: `A tiny error everywhere else shows the check itself works. A large, consistent error localised to one layer points at that layer's backward code.` },
    hints: [
      `Hint 1: Flatten all parameters into one list θ in the required order; write loss(θ) that unflattens and runs the forward pass.`,
      `Hint 2: For each index k: copy θ, add ε at k → L₊; copy θ, subtract ε → L₋; gradient ≈ (L₊ − L₋)/(2ε).`,
      `Hint 3: Never modify the caller's lists in place (copy first). Use ε = 1e-5 and float arithmetic.`
    ],
    approach: `<p>Treat the network as a black-box function of a flat parameter vector and estimate every partial with a symmetric difference. In practice you then compare with backprop using the relative error |a − n| / (|a| + |n|) and expect about 10<sup>−7</sup> or less.</p>`,
    complexity: `<p>O(P × H × D) time: two forward passes (each O(H·D)) for each of the P = H·D + 2H + 1 parameters. O(P) extra space.</p>`,
    followUps: ['Return the maximum relative error against a provided analytic gradient instead.', 'Why should dropout be disabled during a gradient check?']
  }));

  practice.push(PR('adamopt', {
    title: 'Minimise a Quadratic With Adam', level: 'Hard', tags: ['optimisers', 'Adam'], companies: ['Meta', 'Google DeepMind'],
    statement: `<p>Minimise f(x) = (x − c)² with Adam (β₁ = 0.9, β₂ = 0.999, ε = 10<sup>−8</sup>, bias correction, t starting at 1), starting from x0 with m = v = 0. Write <code>adam_optimize(c, x0, lr, steps)</code> returning x after the given number of steps.</p>`,
    constraints: `<p>|c|, |x0| ≤ 10<sup>4</sup>, 0 &lt; lr ≤ 1, 0 ≤ steps ≤ 10<sup>4</sup>. Compared with a small tolerance, so follow the update exactly.</p>`,
    example: `<p><code>c = 3, x0 = 0, lr = 0.1, steps = 1</code> → <code class="c-g">0.1</code>: the first Adam step is exactly lr in the downhill direction. <code>c = 1000, x0 = 0, lr = 0.1, steps = 10</code> → <code class="c-y">≈ 1.0</code>: even 1000 units from the target, Adam moves only about lr per step, unlike plain gradient descent, whose step would be proportional to the huge gradient.</p>`,
    bruteWhy: `<p>Plain gradient descent with lr = 0.1 multiplies the distance to c by 1 − 0.2 = 0.8 per step, so on this one perfect bowl it is actually faster, and for c = 1000 its first step alone is 200 units. Adam's normalised steps are slower here but scale-free, which is what matters when different weights have gradients of very different sizes.</p>`,
    mcq: { q: `Adam with lr = 0.1 is 1000 units from the minimum of (x − c)². About how many steps does it need to get close?`, options: ['Roughly 10,000: it moves about lr per step', 'About 10', 'About 1', 'It cannot get there'], answer: 0, explain: `Adam's step is about lr·m̂/√v̂ ≈ lr while the gradient keeps the same sign. 1000 / 0.1 = 10,000 steps. This is why Adam's lr is "the size of a step", not a multiplier on the gradient.` },
    hints: [
      `Hint 1: Loop t from 1 to steps; the gradient is 2(x − c).`,
      `Hint 2: m = β₁m + (1 − β₁)g; v = β₂v + (1 − β₂)g²; m̂ = m/(1 − β₁ᵗ); v̂ = v/(1 − β₂ᵗ).`,
      `Hint 3: x -= lr·m̂/(√v̂ + ε). steps = 0 returns x0; starting at the minimum stays there (g = 0 → step 0).`
    ],
    approach: `<p>Repeat the single Adam step from the guided problem. Near the minimum, momentum makes x overshoot a little and oscillate with shrinking amplitude; far away, it travels at about lr per step.</p>`,
    complexity: `<p>O(steps) time, O(1) space.</p>`,
    followUps: ['Compare the number of steps to reach |x − c| &lt; 0.01 for Adam and for GD with its best lr.', 'What happens if you drop bias correction?']
  }));

  practice.push(PR('train', {
    title: 'Train a Tiny Network End to End', level: 'Hard', tags: ['backpropagation', 'training loop', 'neural networks'], companies: ['OpenAI', 'Tesla', 'Apple'],
    statement: `<p>Train the 1-hidden-layer network h = σ(W1·x + b1), ŷ = w2·h + b2 on a dataset (rows X, targets Y) by full-batch gradient descent on the <b>mean</b> of ½(ŷ − y)² over the examples. Each epoch: average the gradients over all examples, then update every parameter once with learning rate lr. Write <code>train_tiny_net(X, Y, W1, b1, w2, b2, lr, epochs)</code> returning <code>[loss before training, loss after training]</code>. Do not modify the input lists.</p>`,
    constraints: `<p>1 ≤ n ≤ 100, 1 ≤ D, H ≤ 8, 0 ≤ epochs ≤ 1000. Compared with a small tolerance.</p>`,
    example: `<p><code>X = [[0], [1]], Y = [0, 1], W1 = [[1], [−1]], b1 = [0, 0], w2 = [0.5, 0.5], b2 = 0, lr = 0.5, epochs = 200</code> → <code class="c-g">[0.125, ≈ 2·10⁻⁸]</code>. Why the first value: with these weights ŷ = 0.5 for both inputs (σ(1)·0.5 + σ(−1)·0.5 = 0.5), so the mean loss is ½·(0.25 + 0.25)/2 = 0.125. Training then fits both points almost perfectly.</p>`,
    bruteWhy: `<p>Updating the weights after every example (SGD) instead of once per epoch gives a different path and different numbers. So does summing instead of averaging the gradients (which multiplies the effective lr by n). The specification is full-batch, averaged.</p>`,
    mcq: { q: `You train on XOR with this network and the loss gets stuck at 0.125 (predicting 0.5 for everything). A plausible cause is…`, options: ['Symmetric or unlucky initial weights plus a too-small network or learning rate', 'Gradient descent cannot train neural networks', 'The loss is convex', 'The bias terms are unnecessary'], answer: 0, explain: `The loss is non-convex. Some starts sit near a flat region where the network outputs the mean target. More hidden units, a different seed or lr, or tanh/ReLU activations usually escape.` },
    hints: [
      `Hint 1: Copy W1, b1, w2 first. Write forward(x) returning h and ŷ, and mean_loss() over the dataset.`,
      `Hint 2: Per epoch, zero the gradient accumulators; for each example add the backprop gradients scaled by 1/n (d = (ŷ − y)/n).`,
      `Hint 3: Only after the loop over examples, subtract lr × gradient from every parameter. Return [initial mean loss, mean loss after the final epoch]; epochs = 0 returns the same value twice.`
    ],
    approach: `<p>The full training loop in miniature: forward on every example, backprop the averaged loss, one simultaneous update per epoch. It is the same structure as a PyTorch loop with batch size n.</p>`,
    complexity: `<p>O(epochs × n × H × D) time, O(H × D) extra space for parameters and gradients.</p>`,
    followUps: ['Switch to mini-batches of size 1 (SGD). How do the results change?', 'Add momentum to the update and compare the loss after 50 epochs.']
  }));

  practice.push(PR('adamw', {
    title: 'Adam + L2 vs AdamW', level: 'Hard', tags: ['optimisers', 'weight decay', 'regularisation'], companies: ['Hugging Face', 'Anthropic', 'Google'],
    statement: `<p>A weight w has data loss ½·a·w² (gradient a·w). Run two optimisers for <code>steps</code> steps from w0 (β₁ = 0.9, β₂ = 0.999, ε = 10<sup>−8</sup>, bias correction, fresh m = v = 0):</p>
      <ol><li><b>Adam + L2</b>: gradient g = a·w + wd·w, then a normal Adam step.</li>
      <li><b>AdamW</b>: gradient g = a·w, computed from w at the start of the step (before the shrink); then shrink w ← w − lr·wd·w, then apply the Adam step computed from that g (as torch.optim.AdamW does).</li></ol>
      <p>Write <code>adam_l2_vs_adamw(a, w0, lr, wd, steps)</code> returning <code>[w_adam_l2, w_adamw]</code>.</p>`,
    constraints: `<p>a ≥ 0, wd ≥ 0, 0 &lt; lr ≤ 1, 0 ≤ steps ≤ 10<sup>4</sup>. Compared with a small tolerance.</p>`,
    example: `<p><code>a = 0, w0 = 1, lr = 0.01, wd = 0.5, steps = 20</code> → <code class="c-g">[0.8027, 0.9046]</code>. With no data gradient, Adam + L2 normalises the decay gradient wd·w to a step of about lr each time (20 × 0.01 ≈ 0.2), while AdamW shrinks w by the factor (1 − lr·wd) = 0.995 per step: 0.995<sup>20</sup> ≈ 0.905. The two are genuinely different algorithms.</p>`,
    bruteWhy: `<p>A tempting shortcut is to assume the two are equivalent, as they are for plain SGD. With Adam, the L2 gradient is divided by √v̂, so weights with large gradient history are barely decayed. That mismatch is the reason AdamW was introduced.</p>`,
    mcq: { q: `In AdamW, the weight-decay shrink per step for a weight w is…`, options: ['lr·wd·w, independent of the gradient history', 'wd·w / √v̂', 'lr·wd', 'zero once m is large'], answer: 0, explain: `Decoupled weight decay multiplies w by (1 − lr·wd) every step, whatever Adam's moment estimates are. In Adam + L2 the decay term is rescaled by 1/√v̂ like any other gradient.` },
    hints: [
      `Hint 1: Write one run(decoupled) function with an Adam loop; the two variants differ in only two lines.`,
      `Hint 2: Adam + L2: g = a·w + wd·w. AdamW: g = a·w, and before the Adam step do w -= lr·wd·w.`,
      `Hint 3: The Adam step uses bias correction with t from 1. steps = 0 returns [w0, w0]; wd = 0 makes both answers equal.`
    ],
    approach: `<p>Simulate both. The only difference is whether the decay goes through Adam's normalisation (coupled L2) or is applied directly to the weight (decoupled AdamW, as in <code>torch.optim.AdamW</code>).</p>`,
    complexity: `<p>O(steps) time per variant, O(1) space.</p>`,
    followUps: ['Why do most recipes exclude biases and LayerNorm weights from weight decay?', 'PyTorch\'s Adam(weight_decay=…) is which of the two?']
  }));

  // ===================== QUIZ =====================
  quiz.push({ q: `What is the derivative of <code>f(x) = 3x² − 4x + 7</code> at x = 2?`, options: ['8', '12', '5', '−4'], answer: 0, explain: `f′(x) = 6x − 4 (power rule; the constant 7 vanishes). At x = 2: 12 − 4 = 8.` });
  quiz.push({ q: `Why is the central difference (f(x + h) − f(x − h)) / 2h preferred over the forward difference for gradient checks?`, options: ['Its error shrinks like h² instead of h', 'It needs only one function evaluation', 'It works with h = 0', 'It is exact for every function'], answer: 0, explain: `The f″ terms of the Taylor expansion cancel in the symmetric difference, leaving an error proportional to h²·f‴.` });
  quiz.push({ q: `y = (2x + 1)³. What is dy/dx at x = 0?`, options: ['6', '3', '2', '1'], answer: 0, explain: `Chain rule: 3(2x + 1)² × 2. At x = 0: 3·1·2 = 6.` });
  quiz.push({ q: `For f(x, y) = x²y, what is the gradient at (3, 2)?`, options: ['[12, 9]', '[6, 9]', '[12, 6]', '[9, 12]'], answer: 0, explain: `∂f/∂x = 2xy = 12, ∂f/∂y = x² = 9.` });
  quiz.push({ q: `The gradient of a loss points…`, options: ['in the direction of steepest increase, so we step the opposite way', 'towards the minimum', 'along a contour line', 'in a random direction'], answer: 0, explain: `∇L is steepest ascent; gradient descent uses −∇L. The gradient is perpendicular to contour lines, not along them.` });
  quiz.push({ q: `Gradient descent on f(x) = 5(x − 1)². Which learning rate diverges?`, options: ['0.25', '0.15', '0.1', '0.05'], answer: 0, explain: `The factor is 1 − 2·5·lr = 1 − 10·lr. It must satisfy |1 − 10·lr| &lt; 1, i.e. 0 &lt; lr &lt; 0.2. lr = 0.25 gives −1.5: diverges.` });
  quiz.push({ q: `Sigmoid output p = 0.2, true label y = 1, binary cross-entropy loss. What is ∂L/∂z (z = the logit)?`, options: ['−0.8', '−1.25', '0.16', '−0.2'], answer: 0, explain: `For sigmoid + BCE the gradient on the logit is p − y = 0.2 − 1 = −0.8.` });
  quiz.push({ q: `Logits [0, 0, 0], target class 1, softmax cross-entropy. What is the loss?`, options: ['ln 3 ≈ 1.099', '0', '1/3', 'ln 2 ≈ 0.693'], answer: 0, explain: `Softmax is uniform (1/3 each), so the loss is −ln(1/3) = ln 3. A K-class model guessing uniformly always scores ln K.` });
  quiz.push({ q: `In backprop for a linear layer z = W·a, with δ = dL/dz, what is dL/dW?`, options: ['δ · aᵀ (outer product)', 'Wᵀ · δ', 'a · δ (dot product)', 'δ · W'], answer: 0, explain: `Each weight W[j][i] connects input i to output j, so its gradient is δⱼ·aᵢ: the outer product, same shape as W. Wᵀδ is the gradient passed back to a.` });
  quiz.push({ q: `Momentum with β = 0.9 and a constant gradient g. The velocity tends to…`, options: ['10g', 'g', '0.9g', '0'], answer: 0, explain: `v = g + βg + β²g + … = g/(1 − β) = 10g.` });
  quiz.push({ q: `At Adam's first step (m = v = 0 beforehand), the bias-corrected update size is about…`, options: ['lr, whatever the gradient\'s size', 'lr × g', 'lr × g²', '10 × lr'], answer: 0, explain: `m̂ = g and v̂ = g², so m̂/√v̂ = ±1 and the step is ±lr.` });
  quiz.push({ q: `Training loss keeps falling while validation loss started rising 5 epochs ago. Best action?`, options: ['Stop and restore the checkpoint with the lowest validation loss', 'Raise the learning rate', 'Train for many more epochs', 'Remove the validation set'], answer: 0, explain: `This is overfitting. Early stopping keeps the best-validation checkpoint; you might also add regularisation or data.` });
  quiz.push({ q: `Adding the L2 penalty λ·w² to a loss changes the gradient by…`, options: ['+2λw', '+λ', '+λ·sign(w)', 'nothing'], answer: 0, explain: `d(λw²)/dw = 2λw: a pull towards zero proportional to the weight. λ·sign(w) is the L1 gradient.` });
  quiz.push({ q: `Which loss is NOT convex in its parameters?`, options: ['MSE of a neural network with a hidden layer', 'MSE of linear regression', 'Cross-entropy of logistic regression', 'Linear regression MSE plus an L2 penalty'], answer: 0, explain: `Linear and logistic regression losses are convex (and stay convex with L2). A hidden layer multiplies weights together, creating many valleys and saddle points.` });

  // ===================== INTERVIEW =====================
  interview.push({ q: `Explain what a derivative and a gradient are, as if to a new engineer, and why they matter for training models.`, level: 'B',
    a: `<p>A derivative is the slope of a function at a point: how much the output changes per tiny change of the input. A model's loss depends on many weights, so we use partial derivatives, one per weight, holding the others fixed. Stacking them gives the gradient, a vector with the same shape as the parameters. It points in the direction that increases the loss fastest, and its length says how steep that is. Training is "take a small step against the gradient, repeat": gradient descent. So the gradient is the instruction manual for every weight: which way to move and roughly how much. Frameworks compute it automatically with backpropagation, but knowing what it means lets you read loss curves, pick learning rates and debug training.</p>`,
    followUps: ['What does a zero gradient tell you?', 'Why is the gradient the same shape as the parameters?'] });
  interview.push({ q: `Walk me through the chain rule and how backpropagation uses it.`, level: 'B',
    a: `<p>If y depends on u and u depends on x, then dy/dx = dy/du · du/dx: multiply the local rates along the chain. A network is a long composition (linear layer, activation, linear layer, loss), so the derivative of the loss with respect to an early weight is a product of local derivatives through every later layer. Backpropagation organises this efficiently: the forward pass computes and caches every intermediate value; the backward pass starts with dL/dL = 1 at the loss and walks the graph in reverse, multiplying by each node's local derivative, and where a value feeds several places, it adds the contributions. One backward pass gives the gradient for every parameter at about twice the cost of the forward pass, which is why it scales to billions of weights.</p>`,
    followUps: ['Why is reverse mode preferred over forward mode for neural networks?', 'Why does PyTorch accumulate gradients?'] });
  interview.push({ q: `How do you choose a learning rate? What happens if it is too high or too low?`, level: 'B',
    a: `<p>Too low and training crawls or stalls on plateaus; too high and the loss oscillates, spikes or diverges to NaN. For a quadratic f = a(x − c)² the update multiplies the error by (1 − 2a·lr), so it converges only for lr &lt; 1/a; in many dimensions the steepest curvature sets the limit (lr &lt; 2/λ<sub>max</sub>) while the flattest sets the speed. In practice I run a short sweep on a log scale (for example 1e-4 to 1e-1), keep the largest value whose loss falls smoothly, then add warm-up and a decay schedule. Defaults help: about 1e-3 for Adam from scratch, much smaller (1e-5 to 1e-4) for fine-tuning pretrained models, and I scale it with batch size. Gradient clipping is a safety net, not a substitute.</p>`,
    followUps: ['What is a learning-rate finder?', 'How should lr change if you double the batch size?'] });
  interview.push({ q: `Compare MSE and cross-entropy. Why do classifiers use cross-entropy?`, level: 'I',
    a: `<p>MSE averages squared errors and suits regression; it corresponds to maximum likelihood under Gaussian noise. Cross-entropy, −Σ y·ln p, is the negative log-likelihood of a categorical (or Bernoulli) model, so it suits classification. The practical reason is the gradient: with a sigmoid or softmax output, cross-entropy's gradient on the logits is simply p − y, which stays large when the model is confidently wrong. MSE through a sigmoid has an extra p(1 − p) factor, so a prediction of 0.01 for a true 1 gets a gradient around 0.02 instead of 0.99, and learning stalls. Cross-entropy also punishes confident mistakes heavily, which encourages well-calibrated probabilities (deep networks can still end up over-confident). I compute it from logits (log-sum-exp) for numerical stability.</p>`,
    followUps: ['What is perplexity?', 'What value should the initial loss be for a 10-class problem?'] });
  interview.push({ q: `Derive the gradient of softmax followed by cross-entropy with respect to the logits.`, level: 'I',
    a: `<p>Let pᵢ = e<sup>zᵢ</sup>/Σⱼe<sup>zⱼ</sup> and L = −ln p<sub>t</sub> = −z<sub>t</sub> + ln Σⱼe<sup>zⱼ</sup>. Differentiate: ∂/∂zᵢ of −z<sub>t</sub> is −1 if i = t, else 0; ∂/∂zᵢ of ln Σe<sup>zⱼ</sup> is e<sup>zᵢ</sup>/Σe<sup>zⱼ</sup> = pᵢ. So ∂L/∂zᵢ = pᵢ − [i = t], i.e. p − one_hot(t). Example: logits [2, 1, 0.1], target 0: p ≈ [0.659, 0.242, 0.099], gradient [−0.341, 0.242, 0.099]. The entries sum to zero; the correct class is pushed up and the others down in proportion to the probability they took. Writing L in log-sum-exp form is also how you implement it stably.</p>`,
    followUps: ['How does label smoothing change this?', 'Why do frameworks fuse softmax and cross-entropy into one operation?'] });
  interview.push({ q: `Backpropagate by hand through a one-hidden-layer network. What are the general rules?`, level: 'I',
    a: `<p>Forward: z₁ = W₁x + b₁, h = σ(z₁), ŷ = w₂·h + b₂, L = ½(ŷ − y)², caching z₁/h and ŷ. Backward: δ<sub>out</sub> = ŷ − y; dw₂ = δ<sub>out</sub>·h, db₂ = δ<sub>out</sub>; pass back dh = δ<sub>out</sub>·w₂; multiply by the activation slope, δ₁ = dh ⊙ h(1 − h); then dW₁ = δ₁xᵀ and db₁ = δ₁. The general per-layer rules are: weight gradient = δ times the layer's input transposed (outer product), bias gradient = δ, gradient to the previous layer = Wᵀδ, then multiply element-wise by that layer's activation derivative. For a batch, average over examples, which turns the outer products into one matrix multiplication. I verify with a numeric gradient check in float64.</p>`,
    followUps: ['What changes with ReLU?', 'Why does the backward pass need the forward activations?'] });
  interview.push({ q: `What is a gradient check and how do you do it properly?`, level: 'I',
    a: `<p>It compares analytic gradients from backprop with numeric estimates. For each parameter θₖ, compute (L(θ + εeₖ) − L(θ − εeₖ)) / 2ε with ε ≈ 1e-5, in float64, and compare with the analytic value via the relative error |a − n| / (|a| + |n|). Around 1e-7 or below is a pass; 1e-4 or worse suggests a bug, especially if it is localised to one layer. Pitfalls: float32 is too imprecise; too small an ε causes cancellation; kinks such as ReLU at 0 or max ties can legitimately disagree; randomness such as dropout must be off; and for big models you check a random sample of parameters. In PyTorch, torch.autograd.gradcheck does this for custom functions.</p>`,
    followUps: ['Why central rather than forward differences?', 'How would you test a custom CUDA kernel\'s backward?'] });
  interview.push({ q: `Explain momentum, RMSProp and Adam. When would you choose SGD with momentum over Adam?`, level: 'I',
    a: `<p>Momentum keeps a velocity v = βv + g and steps by lr·v: consistent gradient directions accelerate (up to 1/(1 − β) times) and oscillating ones cancel, which helps in long narrow valleys. RMSProp divides each coordinate's gradient by a running root-mean-square of its past gradients, giving per-parameter step sizes. Adam combines both: m (mean gradient) and v (mean squared gradient), bias-corrected because they start at zero, and steps by lr·m̂/(√v̂ + ε), so steps are about lr regardless of gradient scale. Adam (as AdamW) is the default for transformers and most new models because it is robust to badly scaled parameters and needs less tuning. SGD with momentum still shines for some vision models, where it can generalise slightly better, and it uses less memory (one state tensor instead of two).</p>`,
    followUps: ['Why does Adam need bias correction?', 'How much optimiser memory does Adam need per parameter?'] });
  interview.push({ q: `What is the difference between Adam with L2 regularisation and AdamW?`, level: 'A',
    a: `<p>L2 regularisation adds λw to the gradient. In plain SGD that is identical to weight decay (multiplying w by 1 − lr·λ each step). In Adam the λw term enters m and v and is divided by √v̂, so parameters with large historical gradients get almost no decay and those with tiny gradients get a lot: the regularisation strength becomes uneven and tied to the gradient statistics. AdamW decouples it: the Adam step uses only the loss gradient, and the weight is separately shrunk by lr·λ·w. This gives the intended, uniform shrinkage, makes the best weight decay less dependent on the learning rate, and generalises better in practice, which is why AdamW is the standard for transformers. Recipes usually exclude biases and normalisation weights from decay.</p>`,
    followUps: ['Which one does torch.optim.Adam(weight_decay=...) implement?', 'Why exclude LayerNorm weights from decay?'] });
  interview.push({ q: `Your training loss suddenly spikes and then becomes NaN. How do you debug it?`, level: 'A',
    a: `<p>First reproduce and localise: log the loss, gradient norm and learning rate per step, and find the first non-finite value. Common causes in order: learning rate too high (or warm-up too short), which shows as a growing gradient norm before the spike; a bad batch (corrupt data, extreme values, empty sequences, label errors), found by logging batch IDs; numerical instability, such as log(0), exp overflow, division by a tiny norm or float16 overflow (use bf16 or loss scaling, compute losses from logits, add epsilons); and code bugs such as a missing zero_grad or wrong masking. Fixes: lower the peak lr or lengthen warm-up, clip gradients (for example to norm 1.0), lower Adam's β₂ to around 0.95 for faster reaction, skip or fix bad batches, and use anomaly detection (torch.autograd.set_detect_anomaly) on a small repro to find the offending operation.</p>`,
    followUps: ['How does gradient clipping work?', 'Why is bf16 safer than fp16 for training?'] });
  interview.push({ q: `How do you detect and fix overfitting? Discuss several regularisation methods.`, level: 'I',
    a: `<p>Detect it by comparing training and validation metrics: a widening gap, with validation loss rising while training loss falls. Fixes, roughly in order of value: more or better data and data augmentation; early stopping on validation loss with checkpoint restore; L2 regularisation/weight decay, which adds 2λw to the gradient and prefers smaller, smoother weights; L1, which drives some weights to exactly zero; dropout, which randomly zeros activations so units cannot co-adapt; reducing capacity (smaller model, fewer features); and, for fine-tuning, fewer epochs, lower learning rates and parameter-efficient methods like LoRA. All regularisation strengths are tuned on validation data, and the test set is touched once at the end. I also rule out leakage first, because a suspiciously good validation score is often a split problem.</p>`,
    followUps: ['Why does L1 give sparse weights but L2 does not?', 'How does dropout behave at inference time?'] });
  interview.push({ q: `What is convexity and why does it matter? Neural network losses are not convex, so why does gradient descent still work?`, level: 'A',
    a: `<p>A function is convex if every chord lies on or above its graph (for smooth functions, the Hessian is positive semi-definite everywhere). For convex losses, any local minimum is global, so gradient descent with a suitable step size reaches the best solution, with convergence-rate guarantees; linear regression MSE and logistic regression cross-entropy are convex, and adding L2 keeps them so. Neural networks are non-convex because weights multiply across layers and hidden units are interchangeable. Gradient descent still works because in very high dimensions many critical points are saddle points rather than bad local minima, SGD noise helps escape saddles, overparameterised networks have many connected, near-equally good minima, and techniques like good initialisation, normalisation, residual connections and adaptive optimisers keep the landscape navigable. Flat minima found this way tend to generalise well.</p>`,
    followUps: ['How can you tell a saddle point from a minimum?', 'What is double descent?'] });
  interview.push({ q: `Why are warm-up and learning-rate decay used when training large models?`, level: 'A',
    a: `<p>At initialisation the gradients and Adam's second-moment estimates change quickly and are poorly estimated, so taking full-size steps immediately can push the model into unstable regions (loss spikes, divergence, especially with large batches and post-norm layouts). A linear warm-up over the first few hundred to few thousand steps ramps lr up while statistics settle. Decay works the other way at the end: a high lr explores and makes fast progress but bounces around the valley floor because of gradient noise; lowering it (cosine, linear, or a sharp final decay in warm-up–stable–decay schedules) lets the model settle into a lower loss. Much of the final loss improvement typically happens during the decay. WSD schedules are popular because you can branch a decayed checkpoint off at any time and keep training the stable branch.</p>`,
    followUps: ['How do you resume training mid-schedule?', 'What goes wrong if the scheduler is stepped per epoch instead of per step?'] });
  interview.push({ q: `How do you review AI-generated training or optimisation code, and how do you test it?`, level: 'E',
    a: `<p>I check the calculus and the loop separately. For the maths: every gradient has the parameter's shape; custom backward functions include every chain-rule factor (activation slopes, transposes, the 1/n of a mean); losses are computed from logits with stable functions; and nothing in the graph is accidentally detached or modified in place. For the loop: zero_grad every step, model.train()/eval() switching, losses averaged rather than summed, masking of padding and prompt tokens, the scheduler stepped at the right granularity, AdamW rather than Adam with weight_decay when decoupled decay is intended, and decay excluded from biases and norms. Tests: numeric gradient checks in float64 on tiny non-square shapes; overfitting a single small batch to near-zero loss (if it cannot, something is broken); checking that the initial loss is about ln K for K classes; comparing against a slow pure-Python reference; and plotting lr, loss and gradient norm for a short run.</p>`,
    followUps: ['Why is "overfit one batch" such a useful test?', 'What invariants would you assert in a training loop?'] });

  registerModule({
    id: 'ai20',
    title: 'Calculus & Optimization for Machine Learning',
    lang: 'python',
    langExplain: `<p>All code in this module is Python because the AI track uses Python. The runnable demos use <b>plain Python only</b> (the standard library: no NumPy, no PyTorch) so you can see every derivative, every chain-rule multiplication and every optimiser update happen line by line. Each topic also shows the PyTorch version (autograd, <code>torch.optim.SGD</code>, <code>torch.optim.AdamW</code>, schedulers) that you would use at work; those snippets are for reading, not for running here.</p>`,
    intro: `<p>Every model you will train learns the same way: it measures how wrong it is with a <b>loss function</b>, works out which way each weight should move with <b>derivatives and gradients</b>, and takes a small step with an <b>optimiser</b>. That is calculus and optimisation, and this module teaches exactly the part machine learning needs, starting from "slope = rise over run".</p>
      <p>You will go from derivatives and the chain rule, to partial derivatives and gradient vectors, to gradient descent and why the learning rate decides whether training converges, crawls or explodes. Then you will meet the two losses that run most of ML (mean squared error and cross-entropy) with their gradients, do <b>backpropagation by hand</b> through a small two-layer network and verify it with a gradient check, compare plain SGD with momentum and <b>Adam</b>, and finish with overfitting, L2 regularisation, early stopping and convexity. Every formula has a worked numeric example, a visualiser you can play with, and a runnable demo in plain Python.</p>
      <p><b>What this unlocks.</b> After this module, these AI modules will read easily: <i>Machine Learning Foundations</i> (loss functions, gradient descent, overfitting and regularisation), <i>Neural Networks &amp; Deep Learning Basics</i> (backpropagation, optimisers, initialisation), <i>How LLMs Work</i> (next-token cross-entropy and perplexity), <i>Fine-Tuning &amp; Alignment</i> (learning rates, AdamW, LoRA and overfitting on small datasets) and <i>Transformer Internals Deep Dive</i> (softmax gradients, warm-up and stability tricks).</p>`,
    goals: [
      'Compute derivatives with the power, product and chain rules, and check any derivative numerically with a central difference',
      'Compute partial derivatives and gradient vectors, and explain why −∇L is the steepest way downhill',
      'Run gradient descent by hand, and predict whether a learning rate converges, crawls, zig-zags or diverges on a quadratic',
      'Compute MSE, binary cross-entropy and softmax cross-entropy and derive their gradients (including the p − y shortcut)',
      'Fit linear and logistic regression by gradient descent in plain Python',
      'Backpropagate through a two-layer network by hand and verify it with a numerical gradient check',
      'Explain and implement momentum, Adam and AdamW, plus warm-up, cosine decay and gradient clipping',
      'Recognise overfitting, apply L2 regularisation and early stopping, and explain convexity and why it matters'
    ],
    prereqs: `<p><b>Needed:</b> <i>Linear Algebra for Machine Learning</i> (AI track): vectors, dot products, matrix multiplication and transposes appear in gradients, the directional derivative and the backprop rules. <b>Helpful:</b> <i>Probability &amp; Statistics for Machine Learning</i> (AI track), because cross-entropy is a negative log-likelihood and L2 regularisation is a Gaussian prior. School maths is enough otherwise: slopes of straight lines, powers, eˣ and ln x. Comfort with Python loops, lists and functions (the Python track's early modules) is assumed.</p>`,
    hours: 10,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
