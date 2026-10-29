(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small helpers shared by the visualizers ---------- */
  function r4(x) { var v = Math.round(x * 10000) / 10000; return v === 0 ? 0 : v; }
  function nums(s, name, maxLen) {
    var a = String(s).trim().split(/[\s,]+/).filter(function (t) { return t !== ''; }).map(Number);
    if (!a.length || a.some(function (v) { return !isFinite(v); })) throw new Error('Enter ' + (name || 'numbers') + ' as numbers separated by spaces, e.g. 1 2 3');
    if (a.length > (maxLen || 8)) throw new Error('Use at most ' + (maxLen || 8) + ' numbers for ' + (name || 'this input'));
    return a;
  }
  function ints(s, name, maxLen) {
    var a = String(s).trim() === '' ? [] : nums(s, name, maxLen);
    if (a.some(function (v) { return v < 0 || Math.floor(v) !== v; })) throw new Error('Use whole numbers ≥ 0 for ' + name);
    return a;
  }
  function splitBar(s, n, hint) {
    var p = String(s).split('|');
    if (p.length !== n) throw new Error('Format: ' + hint);
    return p;
  }
  function one(i, cls) { var o = {}; o[i] = cls; return o; }

  /* builds a problem; `key` pulls the Python model solution, brute code and tests from SOL/TESTS */
  function PR(key, o) {
    var s = SOL[key], t = TESTS[key];
    var brute = { why: o.bruteWhy };
    if (s && s.brute) brute.code = { lang: 'python', code: s.brute };
    var sol = { approach: o.approach, complexity: o.complexity, followUps: o.followUps || [] };
    if (s) sol.code = { lang: 'python', code: s.code };
    var a = ALT[key];
    if (a) sol.alt = ['java', 'js', 'cpp', 'csharp'].map(function (l) { return { lang: l, code: a[l] }; });
    if (o.dry) sol.dry = o.dry;
    var p = {
      title: o.title, level: o.level, tags: o.tags, companies: o.companies || [], lang: 'python',
      statement: o.statement, constraints: o.constraints, example: o.example,
      brute: brute, mcq: o.mcq, hints: o.hints, solution: sol
    };
    p.tests = { sig: t.sig, fn: t.fn, cmp: t.cmp, cases: t.cases };
    return p;
  }

  // ---- Python model solutions (plain Python, no torch, so the checker can run them) ----
  var SOL = {
    bcast: { code: `def broadcast_shape(a, b):
    # PyTorch/NumPy rule: line the shapes up from the RIGHT, compare one dim at a time.
    # Two dims fit if they are equal or one of them is 1. A missing dim counts as 1.
    out = []
    n = max(len(a), len(b))
    for k in range(1, n + 1):                  # k = 1 is the last (rightmost) dim
        x = a[-k] if k <= len(a) else 1
        y = b[-k] if k <= len(b) else 1
        if x == y or y == 1:
            out.append(x)                     # equal, or b's 1 is stretched to x
        elif x == 1:
            out.append(y)                     # a's 1 is stretched to y
        else:
            return [-1]                       # e.g. 2 vs 3: PyTorch raises a RuntimeError
    return out[::-1]                          # we built it right-to-left
`, brute: `def broadcast_shape(a, b):
    # Naive: pad both shapes with leading 1s to the same length first, then compare.
    # Same answer, but it copies both shapes (fine here; shows the "pad on the left" idea).
    n = max(len(a), len(b))
    a = [1] * (n - len(a)) + list(a)
    b = [1] * (n - len(b)) + list(b)
    out = []
    for x, y in zip(a, b):
        if x != y and x != 1 and y != 1:
            return [-1]
        out.append(y if x == 1 else x)
    return out
` },
    engine: { code: `import math

class Value:
    """A scalar that remembers how it was made, like a tiny torch.Tensor with requires_grad=True."""
    def __init__(self, data, parents=()):
        self.data = data
        self.grad = 0.0
        self._parents = parents        # tuple of (parent_value, local_derivative)

    def backward(self):
        # 1) topological order: every node appears after the nodes it was built from
        order, seen = [], set()
        def visit(v):
            if id(v) in seen:
                return
            seen.add(id(v))
            for p, _ in v._parents:
                visit(p)
            order.append(v)
        visit(self)
        # 2) seed dL/dL = 1, then walk backwards applying the chain rule
        self.grad = 1.0
        for v in reversed(order):
            for p, local in v._parents:
                p.grad += v.grad * local   # += : a node used twice collects both paths

def backprop_graph(vals, ops):
    nodes = [Value(float(x)) for x in vals]
    for op in ops:
        parts = op.split()
        name, a = parts[0], nodes[int(parts[1])]
        if name == 'add':
            b = nodes[int(parts[2])]
            nodes.append(Value(a.data + b.data, ((a, 1.0), (b, 1.0))))
        elif name == 'mul':
            b = nodes[int(parts[2])]
            nodes.append(Value(a.data * b.data, ((a, b.data), (b, a.data))))
        elif name == 'relu':
            nodes.append(Value(max(0.0, a.data), ((a, 1.0 if a.data > 0 else 0.0),)))
        elif name == 'tanh':
            t = math.tanh(a.data)
            nodes.append(Value(t, ((a, 1 - t * t),)))
    nodes[-1].backward()
    return [nodes[i].grad for i in range(len(vals))]
`, brute: `import math

def backprop_graph(vals, ops):
    # Numeric gradients: nudge each input up and down and re-run the whole graph.
    # 2 forward passes per input, and only approximate. Autograd needs ONE backward pass.
    def forward(xs):
        v = list(xs)
        for op in ops:
            p = op.split()
            a = v[int(p[1])]
            if p[0] == 'add': v.append(a + v[int(p[2])])
            elif p[0] == 'mul': v.append(a * v[int(p[2])])
            elif p[0] == 'relu': v.append(max(0.0, a))
            else: v.append(math.tanh(a))
        return v[-1]
    h, out = 1e-6, []
    for i in range(len(vals)):
        up = list(vals); up[i] += h
        dn = list(vals); dn[i] -= h
        out.append((forward(up) - forward(dn)) / (2 * h))
    return out
` },
    batches: { code: `def make_batches(n, batch_size, shuffle, drop_last, seed):
    idx = list(range(n))                       # the "sampler": which example goes where
    if shuffle:
        state = seed                           # our own tiny seeded generator (an LCG)
        for i in range(n - 1, 0, -1):          # Fisher-Yates, from the end
            state = (state * 1103515245 + 12345) % 2147483648
            j = state % (i + 1)
            idx[i], idx[j] = idx[j], idx[i]
    batches = []
    for start in range(0, n, batch_size):      # the "batch sampler": cut into chunks
        batch = idx[start:start + batch_size]
        if len(batch) < batch_size and drop_last:
            break                              # drop the short last batch
        batches.append(batch)
    return batches
`, brute: null },
    sgd: { code: `def sgd_momentum_step(params, grads, bufs, lr, momentum, weight_decay, nesterov):
    # One step of torch.optim.SGD (dampening = 0), one parameter at a time.
    new_p, new_b = [], []
    for p, g, b in zip(params, grads, bufs):
        d = g + weight_decay * p        # 1) L2 weight decay is added to the gradient
        b = momentum * b + d            # 2) velocity buffer (bufs start at 0 on a fresh optimizer)
        step = d + momentum * b if nesterov else b   # 3) Nesterov "looks ahead"
        new_p.append(p - lr * step)     # 4) move against the step
        new_b.append(b)
    return [new_p, new_b]
`, brute: null },
    scaler: { code: `def simulate_grad_scaler(init_scale, growth_interval, overflow):
    scale = init_scale
    good_steps = 0        # PyTorch calls this the growth tracker
    skipped = 0
    for bad in overflow:
        if bad:
            # inf/NaN found in the unscaled grads: skip optimizer.step(), shrink the scale
            scale *= 0.5          # backoff_factor
            good_steps = 0
            skipped += 1
        else:
            good_steps += 1       # the step really happened
            if good_steps == growth_interval:
                scale *= 2.0      # growth_factor: try a bigger scale again
                good_steps = 0
    return [scale, skipped]
`, brute: null },
    early: { code: `def early_stopping(val_losses, patience, min_delta):
    best = val_losses[0]
    best_epoch = 0
    waited = 0
    for epoch in range(1, len(val_losses)):
        if val_losses[epoch] < best - min_delta:   # a real improvement, not noise
            best, best_epoch, waited = val_losses[epoch], epoch, 0
        else:
            waited += 1
            if waited >= patience:
                return [best_epoch, epoch]         # restore the checkpoint from best_epoch
    return [best_epoch, -1]                        # ran out of epochs without stopping
`, brute: null },
    freeze: { code: `def finetune_param_counts(dims, num_classes, freeze_backbone):
    # Backbone: Linear(dims[0], dims[1]), Linear(dims[1], dims[2]), ... each with a bias.
    backbone = 0
    for i in range(len(dims) - 1):
        backbone += dims[i] * dims[i + 1] + dims[i + 1]   # weight matrix + bias vector
    # New head: Linear(dims[-1], num_classes), always trainable
    head = dims[-1] * num_classes + num_classes
    total = backbone + head
    trainable = head if freeze_backbone else total
    return [total, trainable]
`, brute: null },
    diag: { code: `def diagnose_run(train, val, target):
    first, last = train[0], train[-1]
    if last > 1.5 * first:
        return 'diverging'          # loss blew up: lr too high, bad data, fp16 overflow ...
    if last > 0.95 * first:
        return 'not_learning'       # under 5% drop: bug, frozen weights, tiny lr, bad labels
    best = min(range(len(val)), key=lambda i: (val[i], i))   # first epoch with the lowest val loss
    if best < len(val) - 1 and val[-1] > 1.1 * val[best]:
        return 'overfitting'        # val went back up by more than 10% while train kept falling
    if last > target:
        return 'underfitting'       # learning, but too weak or too short to reach the goal
    return 'healthy'
`, brute: null },
    dropout: { code: `def dropout_forward(x, mask, p, training):
    if not training:
        return list(x)                 # model.eval(): dropout is the identity
    keep = 1.0 - p
    # inverted dropout: scale survivors by 1/keep so the expected value is unchanged
    return [v / keep if m else 0.0 for v, m in zip(x, mask)]
`, brute: null },
    steplr: { code: `def step_lr(base_lr, step_size, gamma, epoch):
    # torch.optim.lr_scheduler.StepLR: multiply by gamma every step_size epochs
    return base_lr * gamma ** (epoch // step_size)
`, brute: `def step_lr(base_lr, step_size, gamma, epoch):
    # Simulate the scheduler epoch by epoch, the way scheduler.step() does
    lr = base_lr
    for e in range(1, epoch + 1):
        if e % step_size == 0:
            lr *= gamma
    return lr
` },
    acc: { code: `def accuracy(logits, labels):
    correct = 0
    for row, y in zip(logits, labels):
        pred = 0
        for k in range(1, len(row)):
            if row[k] > row[pred]:      # strict > keeps the FIRST max, like torch.argmax
                pred = k
        correct += pred == y
    return correct / len(labels)
`, brute: null },
    steps: { code: `def optimizer_steps(n, batch_size, accum_steps, epochs, drop_last):
    if drop_last:
        batches = n // batch_size
    else:
        batches = (n + batch_size - 1) // batch_size     # ceil: the short last batch counts
    per_epoch = (batches + accum_steps - 1) // accum_steps  # a partial group still steps
    return per_epoch * epochs
`, brute: null },
    clip: { code: `import math

def clip_grad_norm(grads, max_norm):
    # torch.nn.utils.clip_grad_norm_: one global L2 norm over ALL gradients
    total = math.sqrt(sum(g * g for g in grads))
    coef = max_norm / (total + 1e-6)     # the 1e-6 avoids division by zero
    coef = min(coef, 1.0)                 # only ever shrink, never grow
    return [g * coef for g in grads]
`, brute: `def clip_grad_value(grads, max_norm):
    # A DIFFERENT method (clip_grad_value_): clamp each entry. It changes the direction
    # of the gradient vector, so it does NOT pass these tests.
    return [max(-max_norm, min(max_norm, g)) for g in grads]
` },
    cosrestart: { code: `import math

def cosine_warm_restarts(base_lr, eta_min, t0, t_mult, epoch):
    # CosineAnnealingWarmRestarts: find where we are inside the current cycle
    t_i, t_cur = t0, epoch
    while t_cur >= t_i:        # finished a whole cycle: restart, maybe a longer one
        t_cur -= t_i
        t_i *= t_mult
    cos_part = (1 + math.cos(math.pi * t_cur / t_i)) / 2   # 1 at the start, 0 at the end
    return eta_min + (base_lr - eta_min) * cos_part
`, brute: null },
    ce: { code: `import math

def cross_entropy(logits, targets, ignore_index, label_smoothing):
    total, count = 0.0, 0
    for row, y in zip(logits, targets):
        if y == ignore_index:
            continue                      # e.g. padding tokens: no loss, not counted
        m = max(row)                      # log-sum-exp trick: never exp a big number
        lse = m + math.log(sum(math.exp(z - m) for z in row))
        logp = [z - lse for z in row]     # log_softmax
        c = len(row)
        nll = -logp[y]
        smooth = -sum(logp) / c           # cross-entropy against the uniform distribution
        total += (1 - label_smoothing) * nll + label_smoothing * smooth
        count += 1
    return total / count if count else 0.0
`, brute: `import math

def cross_entropy(logits, targets, ignore_index, label_smoothing):
    # Naive softmax: math.exp(1000) overflows, so large logits crash.
    total, count = 0.0, 0
    for row, y in zip(logits, targets):
        if y == ignore_index:
            continue
        e = [math.exp(z) for z in row]
        p = [v / sum(e) for v in e]
        loss = -math.log(p[y])
        loss = (1 - label_smoothing) * loss + label_smoothing * sum(-math.log(q) for q in p) / len(p)
        total += loss; count += 1
    return total / count if count else 0.0
` },
    plateau: { code: `def reduce_on_plateau(val_losses, lr, factor, patience, min_lr):
    best = float('inf')
    bad_epochs = 0
    for loss in val_losses:          # scheduler.step(val_loss) once per epoch
        if loss < best:
            best, bad_epochs = loss, 0
        else:
            bad_epochs += 1
            if bad_epochs > patience:     # note: MORE than patience bad epochs
                lr = max(lr * factor, min_lr)
                bad_epochs = 0
    return lr
`, brute: null },
    bn: { code: `def batchnorm_running_stats(batches, momentum):
    running_mean, running_var = 0.0, 1.0     # PyTorch's starting values
    for b in batches:
        n = len(b)
        mean = sum(b) / n
        var = sum((x - mean) ** 2 for x in b) / (n - 1)   # UNBIASED variance for the running stat
        running_mean = (1 - momentum) * running_mean + momentum * mean
        running_var = (1 - momentum) * running_var + momentum * var
    return [running_mean, running_var]
`, brute: null },
    accum: { code: `def train_with_accumulation(xs, ys, lr, epochs, micro_batch, accum_steps):
    w = b = 0.0
    n = len(xs)
    num_batches = (n + micro_batch - 1) // micro_batch
    for _ in range(epochs):
        gw = gb = 0.0                  # the .grad buffers: they ADD UP until zero_grad
        waiting = 0
        for bi in range(num_batches):
            lo = bi * micro_batch
            hi = min(n, lo + micro_batch)
            m = hi - lo
            dw = db = 0.0
            for i in range(lo, hi):     # gradient of this micro-batch's MEAN squared error
                err = w * xs[i] + b - ys[i]
                dw += 2 * err * xs[i] / m
                db += 2 * err / m
            gw += dw / accum_steps     # loss / accum_steps, then backward()
            gb += db / accum_steps
            waiting += 1
            if waiting == accum_steps or bi == num_batches - 1:
                w -= lr * gw           # optimizer.step()
                b -= lr * gb
                gw = gb = 0.0          # optimizer.zero_grad()
                waiting = 0
    return [w, b]
`, brute: null },
    resume: { code: `def train_and_resume(w0, a, c, lr, momentum, step_size, gamma, total_steps, crash_step, restore_optimizer):
    # Minimise a * (w - c)^2 with SGD + momentum and a StepLR schedule (stepped every update).
    # At crash_step we "reload a checkpoint". The weights and the scheduler always come back;
    # the momentum buffer only comes back if restore_optimizer is True.
    w = w0
    buf = None                           # PyTorch creates the buffer on the first step
    for t in range(total_steps):
        if t == crash_step and not restore_optimizer:
            buf = None                   # a fresh optimizer: velocity lost
        g = 2 * a * (w - c)
        buf = g if buf is None else momentum * buf + g
        cur_lr = lr * gamma ** (t // step_size)
        w -= cur_lr * buf
    return w
`, brute: null },
    fit: { code: `def fit_with_early_stopping(x_train, y_train, x_val, y_val, lr, batch_size, max_epochs, patience, seed):
    w = b = 0.0
    n = len(x_train)
    state = seed                                  # ONE generator for the whole run
    best_loss, best_epoch, best_w, best_b, bad = float('inf'), -1, 0.0, 0.0, 0
    for epoch in range(max_epochs):
        idx = list(range(n))                      # a new shuffle every epoch
        for i in range(n - 1, 0, -1):
            state = (state * 1103515245 + 12345) % 2147483648
            j = state % (i + 1)
            idx[i], idx[j] = idx[j], idx[i]
        for start in range(0, n, batch_size):     # model.train(): one SGD step per batch
            batch = idx[start:start + batch_size]
            dw = db = 0.0
            for i in batch:
                err = w * x_train[i] + b - y_train[i]
                dw += 2 * err * x_train[i] / len(batch)
                db += 2 * err / len(batch)
            w -= lr * dw
            b -= lr * db
        # model.eval() + torch.no_grad(): measure, never update
        val = sum((w * x + b - y) ** 2 for x, y in zip(x_val, y_val)) / len(x_val)
        if val < best_loss:
            best_loss, best_epoch, best_w, best_b, bad = val, epoch, w, b, 0   # "save checkpoint"
        else:
            bad += 1
            if bad >= patience:
                break
    return [best_epoch, best_loss, best_w, best_b]      # "load the best checkpoint"
`, brute: null }
  };
  // ---- the same solutions in Java, JavaScript, C++ and C# (tested like the Python ones; added as solution.alt) ----
  var ALT = {
    bcast: {
      java: String.raw`class Solution {
    public int[] broadcastShape(int[] a, int[] b) {
        // line the shapes up from the RIGHT; equal dims or a 1 fit, a missing dim counts as 1
        int n = Math.max(a.length, b.length);
        int[] out = new int[n];
        for (int k = 1; k <= n; k++) {
            int x = k <= a.length ? a[a.length - k] : 1;
            int y = k <= b.length ? b[b.length - k] : 1;
            if (x == y || y == 1) out[n - k] = x;
            else if (x == 1) out[n - k] = y;
            else return new int[] { -1 };      // PyTorch raises a RuntimeError
        }
        return out;
    }
}`,
      js: String.raw`function broadcastShape(a, b) {
  // line the shapes up from the RIGHT; equal dims or a 1 fit, a missing dim counts as 1
  const n = Math.max(a.length, b.length);
  const out = new Array(n);
  for (let k = 1; k <= n; k++) {
    const x = k <= a.length ? a[a.length - k] : 1;
    const y = k <= b.length ? b[b.length - k] : 1;
    if (x === y || y === 1) out[n - k] = x;
    else if (x === 1) out[n - k] = y;
    else return [-1];                        // PyTorch raises a RuntimeError
  }
  return out;
}`,
      cpp: String.raw`class Solution {
public:
    vector<int> broadcastShape(vector<int>& a, vector<int>& b) {
        // line the shapes up from the RIGHT; equal dims or a 1 fit, a missing dim counts as 1
        int na = a.size(), nb = b.size(), n = max(na, nb);
        vector<int> out(n);
        for (int k = 1; k <= n; k++) {
            int x = k <= na ? a[na - k] : 1;
            int y = k <= nb ? b[nb - k] : 1;
            if (x == y || y == 1) out[n - k] = x;
            else if (x == 1) out[n - k] = y;
            else return {-1};                  // PyTorch raises a RuntimeError
        }
        return out;
    }
};`,
      csharp: String.raw`public class Solution {
    public int[] BroadcastShape(int[] a, int[] b) {
        // line the shapes up from the RIGHT; equal dims or a 1 fit, a missing dim counts as 1
        int n = Math.Max(a.Length, b.Length);
        int[] output = new int[n];
        for (int k = 1; k <= n; k++) {
            int x = k <= a.Length ? a[a.Length - k] : 1;
            int y = k <= b.Length ? b[b.Length - k] : 1;
            if (x == y || y == 1) output[n - k] = x;
            else if (x == 1) output[n - k] = y;
            else return new int[] { -1 };      // PyTorch raises a RuntimeError
        }
        return output;
    }
}`
    },
    engine: {
      java: String.raw`import java.util.*;

class Solution {
    // node i: data[i], grad[i], and its parents as (parent index, local derivative)
    List<Double> data = new ArrayList<>(), grad = new ArrayList<>();
    List<int[]> parIdx = new ArrayList<>();
    List<double[]> parLocal = new ArrayList<>();

    int add(double d, int[] ps, double[] locals) {
        data.add(d); grad.add(0.0); parIdx.add(ps); parLocal.add(locals);
        return data.size() - 1;
    }

    void visit(int v, Set<Integer> seen, List<Integer> order) {
        if (!seen.add(v)) return;
        for (int p : parIdx.get(v)) visit(p, seen, order);
        order.add(v);                          // after every node it was built from
    }

    public double[] backpropGraph(double[] vals, String[] ops) {
        for (double x : vals) add(x, new int[0], new double[0]);
        for (String op : ops) {
            String[] parts = op.split(" ");
            int a = Integer.parseInt(parts[1]);
            double ad = data.get(a);
            if (parts[0].equals("add")) {
                int b = Integer.parseInt(parts[2]);
                add(ad + data.get(b), new int[] { a, b }, new double[] { 1.0, 1.0 });
            } else if (parts[0].equals("mul")) {
                int b = Integer.parseInt(parts[2]);
                double bd = data.get(b);
                add(ad * bd, new int[] { a, b }, new double[] { bd, ad });
            } else if (parts[0].equals("relu")) {
                add(Math.max(0.0, ad), new int[] { a }, new double[] { ad > 0 ? 1.0 : 0.0 });
            } else if (parts[0].equals("tanh")) {
                double t = Math.tanh(ad);
                add(t, new int[] { a }, new double[] { 1 - t * t });
            }
        }
        // backward(): topological order, seed 1, then the chain rule in reverse
        int last = data.size() - 1;
        List<Integer> order = new ArrayList<>();
        visit(last, new HashSet<>(), order);
        grad.set(last, 1.0);
        for (int k = order.size() - 1; k >= 0; k--) {
            int v = order.get(k);
            int[] ps = parIdx.get(v);
            double[] ls = parLocal.get(v);
            for (int i = 0; i < ps.length; i++)
                grad.set(ps[i], grad.get(ps[i]) + grad.get(v) * ls[i]);   // += : both paths count
        }
        double[] out = new double[vals.length];
        for (int i = 0; i < vals.length; i++) out[i] = grad.get(i);
        return out;
    }
}`,
      js: String.raw`class Value {
  // a scalar that remembers how it was made, like a tiny tensor with requires_grad=True
  constructor(data, parents = []) {
    this.data = data;
    this.grad = 0;
    this.parents = parents;               // array of [parentValue, localDerivative]
  }
  backward() {
    const order = [], seen = new Set();
    const visit = (v) => {
      if (seen.has(v)) return;
      seen.add(v);
      for (const [p] of v.parents) visit(p);
      order.push(v);                      // after every node it was built from
    };
    visit(this);
    this.grad = 1;
    for (let k = order.length - 1; k >= 0; k--) {
      const v = order[k];
      for (const [p, local] of v.parents) p.grad += v.grad * local;   // += : both paths count
    }
  }
}

function backpropGraph(vals, ops) {
  const nodes = vals.map((x) => new Value(x));
  for (const op of ops) {
    const parts = op.split(' ');
    const a = nodes[Number(parts[1])];
    if (parts[0] === 'add') {
      const b = nodes[Number(parts[2])];
      nodes.push(new Value(a.data + b.data, [[a, 1], [b, 1]]));
    } else if (parts[0] === 'mul') {
      const b = nodes[Number(parts[2])];
      nodes.push(new Value(a.data * b.data, [[a, b.data], [b, a.data]]));
    } else if (parts[0] === 'relu') {
      nodes.push(new Value(Math.max(0, a.data), [[a, a.data > 0 ? 1 : 0]]));
    } else if (parts[0] === 'tanh') {
      const t = Math.tanh(a.data);
      nodes.push(new Value(t, [[a, 1 - t * t]]));
    }
  }
  nodes[nodes.length - 1].backward();
  return vals.map((_, i) => nodes[i].grad);
}`,
      cpp: String.raw`struct Value {
    double data, grad = 0.0;
    vector<pair<Value*, double>> parents;   // (parent, local derivative)
    Value(double d, vector<pair<Value*, double>> ps = {}) : data(d), parents(ps) {}
};

class Solution {
    void visit(Value* v, set<Value*>& seen, vector<Value*>& order) {
        if (!seen.insert(v).second) return;
        for (auto& pr : v->parents) visit(pr.first, seen, order);
        order.push_back(v);                     // after every node it was built from
    }
public:
    vector<double> backpropGraph(vector<double>& vals, vector<string>& ops) {
        vector<unique_ptr<Value>> nodes;
        for (double x : vals) nodes.push_back(make_unique<Value>(x));
        for (const string& op : ops) {
            istringstream in(op);
            string name; int ia, ib;
            in >> name >> ia;
            Value* a = nodes[ia].get();
            if (name == "add") {
                in >> ib; Value* b = nodes[ib].get();
                nodes.push_back(make_unique<Value>(a->data + b->data, vector<pair<Value*, double>>{{a, 1.0}, {b, 1.0}}));
            } else if (name == "mul") {
                in >> ib; Value* b = nodes[ib].get();
                nodes.push_back(make_unique<Value>(a->data * b->data, vector<pair<Value*, double>>{{a, b->data}, {b, a->data}}));
            } else if (name == "relu") {
                nodes.push_back(make_unique<Value>(max(0.0, a->data), vector<pair<Value*, double>>{{a, a->data > 0 ? 1.0 : 0.0}}));
            } else if (name == "tanh") {
                double t = tanh(a->data);
                nodes.push_back(make_unique<Value>(t, vector<pair<Value*, double>>{{a, 1 - t * t}}));
            }
        }
        // backward(): topological order, seed 1, then the chain rule in reverse
        Value* root = nodes.back().get();
        set<Value*> seen; vector<Value*> order;
        visit(root, seen, order);
        root->grad = 1.0;
        for (int k = (int)order.size() - 1; k >= 0; k--)
            for (auto& pr : order[k]->parents) pr.first->grad += order[k]->grad * pr.second;   // += : both paths count
        vector<double> out;
        for (size_t i = 0; i < vals.size(); i++) out.push_back(nodes[i]->grad);
        return out;
    }
};`,
      csharp: String.raw`public class Value {
    // a scalar that remembers how it was made, like a tiny tensor with requires_grad=True
    public double Data, Grad;
    public List<Tuple<Value, double>> Parents;   // (parent, local derivative)
    public Value(double data, params Tuple<Value, double>[] parents) {
        Data = data;
        Parents = new List<Tuple<Value, double>>(parents);
    }

    public void Backward() {
        var order = new List<Value>();
        var seen = new HashSet<Value>();
        Visit(this, seen, order);
        Grad = 1.0;
        for (int k = order.Count - 1; k >= 0; k--)
            foreach (var p in order[k].Parents) p.Item1.Grad += order[k].Grad * p.Item2;   // += : both paths count
    }

    static void Visit(Value v, HashSet<Value> seen, List<Value> order) {
        if (!seen.Add(v)) return;
        foreach (var p in v.Parents) Visit(p.Item1, seen, order);
        order.Add(v);                               // after every node it was built from
    }
}

public class Solution {
    public double[] BackpropGraph(double[] vals, string[] ops) {
        var nodes = vals.Select(x => new Value(x)).ToList();
        foreach (string op in ops) {
            string[] parts = op.Split(' ');
            Value a = nodes[int.Parse(parts[1])];
            if (parts[0] == "add") {
                Value b = nodes[int.Parse(parts[2])];
                nodes.Add(new Value(a.Data + b.Data, Tuple.Create(a, 1.0), Tuple.Create(b, 1.0)));
            } else if (parts[0] == "mul") {
                Value b = nodes[int.Parse(parts[2])];
                nodes.Add(new Value(a.Data * b.Data, Tuple.Create(a, b.Data), Tuple.Create(b, a.Data)));
            } else if (parts[0] == "relu") {
                nodes.Add(new Value(Math.Max(0.0, a.Data), Tuple.Create(a, a.Data > 0 ? 1.0 : 0.0)));
            } else if (parts[0] == "tanh") {
                double t = Math.Tanh(a.Data);
                nodes.Add(new Value(t, Tuple.Create(a, 1 - t * t)));
            }
        }
        nodes[nodes.Count - 1].Backward();
        var output = new double[vals.Length];
        for (int i = 0; i < vals.Length; i++) output[i] = nodes[i].Grad;
        return output;
    }
}`
    },
    batches: {
      java: String.raw`import java.util.*;

class Solution {
    public int[][] makeBatches(int n, int batchSize, boolean shuffle, boolean dropLast, int seed) {
        int[] idx = new int[n];                    // the "sampler": which example goes where
        for (int i = 0; i < n; i++) idx[i] = i;
        if (shuffle) {
            long state = seed;                     // our own tiny seeded generator (an LCG)
            for (int i = n - 1; i > 0; i--) {      // Fisher-Yates, from the end
                state = Long.remainderUnsigned(state * 1103515245L + 12345L, 2147483648L);
                int j = (int) Long.remainderUnsigned(state, i + 1);
                int t = idx[i]; idx[i] = idx[j]; idx[j] = t;
            }
        }
        List<int[]> batches = new ArrayList<>();
        for (int start = 0; start < n; start += batchSize) {   // the "batch sampler": cut into chunks
            int end = Math.min(n, start + batchSize);
            if (end - start < batchSize && dropLast) break;     // drop the short last batch
            batches.add(Arrays.copyOfRange(idx, start, end));
        }
        return batches.toArray(new int[0][]);
    }
}`,
      js: String.raw`function makeBatches(n, batchSize, shuffle, dropLast, seed) {
  const idx = Array.from({ length: n }, (_, i) => i);   // the "sampler"
  if (shuffle) {
    let state = BigInt(seed);              // our own tiny seeded generator (an LCG); BigInt: the product passes 2^53
    for (let i = n - 1; i > 0; i--) {      // Fisher-Yates, from the end
      state = (state * 1103515245n + 12345n) % 2147483648n;
      const j = Number(state % BigInt(i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
  }
  const batches = [];
  for (let start = 0; start < n; start += batchSize) {  // the "batch sampler": cut into chunks
    const batch = idx.slice(start, start + batchSize);
    if (batch.length < batchSize && dropLast) break;     // drop the short last batch
    batches.push(batch);
  }
  return batches;
}`,
      cpp: String.raw`class Solution {
public:
    vector<vector<int>> makeBatches(int n, int batchSize, bool shuffle, bool dropLast, int seed) {
        vector<int> idx(n);                        // the "sampler": which example goes where
        for (int i = 0; i < n; i++) idx[i] = i;
        if (shuffle) {
            uint64_t state = seed;                 // our own tiny seeded generator (an LCG)
            for (int i = n - 1; i > 0; i--) {      // Fisher-Yates, from the end
                state = (state * 1103515245ULL + 12345ULL) % 2147483648ULL;
                int j = (int)(state % (uint64_t)(i + 1));
                swap(idx[i], idx[j]);
            }
        }
        vector<vector<int>> batches;
        for (int start = 0; start < n; start += batchSize) {   // the "batch sampler": cut into chunks
            int end = min(n, start + batchSize);
            if (end - start < batchSize && dropLast) break;     // drop the short last batch
            batches.push_back(vector<int>(idx.begin() + start, idx.begin() + end));
        }
        return batches;
    }
};`,
      csharp: String.raw`public class Solution {
    public int[][] MakeBatches(int n, int batchSize, bool shuffle, bool dropLast, int seed) {
        int[] idx = Enumerable.Range(0, n).ToArray();   // the "sampler": which example goes where
        if (shuffle) {
            ulong state = (ulong)seed;                   // our own tiny seeded generator (an LCG)
            for (int i = n - 1; i > 0; i--) {            // Fisher-Yates, from the end
                state = unchecked(state * 1103515245UL + 12345UL) % 2147483648UL;
                int j = (int)(state % (ulong)(i + 1));
                int t = idx[i]; idx[i] = idx[j]; idx[j] = t;
            }
        }
        var batches = new List<int[]>();
        for (int start = 0; start < n; start += batchSize) {   // the "batch sampler": cut into chunks
            int end = Math.Min(n, start + batchSize);
            if (end - start < batchSize && dropLast) break;     // drop the short last batch
            batches.Add(idx.Skip(start).Take(end - start).ToArray());
        }
        return batches.ToArray();
    }
}`
    },
    sgd: {
      java: String.raw`class Solution {
    public double[][] sgdMomentumStep(double[] params, double[] grads, double[] bufs, double lr,
                                      double momentum, double weightDecay, boolean nesterov) {
        // one step of torch.optim.SGD (dampening = 0), one parameter at a time
        int n = params.length;
        double[] newP = new double[n], newB = new double[n];
        for (int i = 0; i < n; i++) {
            double d = grads[i] + weightDecay * params[i];   // 1) L2 weight decay
            double b = momentum * bufs[i] + d;               // 2) velocity buffer
            double step = nesterov ? d + momentum * b : b;   // 3) Nesterov "looks ahead"
            newP[i] = params[i] - lr * step;                 // 4) move against the step
            newB[i] = b;
        }
        return new double[][] { newP, newB };
    }
}`,
      js: String.raw`function sgdMomentumStep(params, grads, bufs, lr, momentum, weightDecay, nesterov) {
  // one step of torch.optim.SGD (dampening = 0), one parameter at a time
  const newP = [], newB = [];
  for (let i = 0; i < params.length; i++) {
    const d = grads[i] + weightDecay * params[i];   // 1) L2 weight decay
    const b = momentum * bufs[i] + d;               // 2) velocity buffer
    const step = nesterov ? d + momentum * b : b;   // 3) Nesterov "looks ahead"
    newP.push(params[i] - lr * step);               // 4) move against the step
    newB.push(b);
  }
  return [newP, newB];
}`,
      cpp: String.raw`class Solution {
public:
    vector<vector<double>> sgdMomentumStep(vector<double>& params, vector<double>& grads, vector<double>& bufs,
                                           double lr, double momentum, double weightDecay, bool nesterov) {
        // one step of torch.optim.SGD (dampening = 0), one parameter at a time
        vector<double> newP, newB;
        for (size_t i = 0; i < params.size(); i++) {
            double d = grads[i] + weightDecay * params[i];   // 1) L2 weight decay
            double b = momentum * bufs[i] + d;               // 2) velocity buffer
            double step = nesterov ? d + momentum * b : b;   // 3) Nesterov "looks ahead"
            newP.push_back(params[i] - lr * step);           // 4) move against the step
            newB.push_back(b);
        }
        return {newP, newB};
    }
};`,
      csharp: String.raw`public class Solution {
    public double[][] SgdMomentumStep(double[] parameters, double[] grads, double[] bufs, double lr,
                                      double momentum, double weightDecay, bool nesterov) {
        // one step of torch.optim.SGD (dampening = 0), one parameter at a time
        int n = parameters.Length;
        double[] newP = new double[n], newB = new double[n];
        for (int i = 0; i < n; i++) {
            double d = grads[i] + weightDecay * parameters[i];   // 1) L2 weight decay
            double b = momentum * bufs[i] + d;                   // 2) velocity buffer
            double step = nesterov ? d + momentum * b : b;       // 3) Nesterov "looks ahead"
            newP[i] = parameters[i] - lr * step;                 // 4) move against the step
            newB[i] = b;
        }
        return new double[][] { newP, newB };
    }
}`
    },
    scaler: {
      java: String.raw`class Solution {
    public double[] simulateGradScaler(double initScale, int growthInterval, boolean[] overflow) {
        double scale = initScale;
        int goodSteps = 0, skipped = 0;          // goodSteps: PyTorch's growth tracker
        for (boolean bad : overflow) {
            if (bad) {                           // inf/NaN: skip the step, shrink the scale
                scale *= 0.5;
                goodSteps = 0;
                skipped++;
            } else if (++goodSteps == growthInterval) {
                scale *= 2.0;                    // try a bigger scale again
                goodSteps = 0;
            }
        }
        return new double[] { scale, skipped };
    }
}`,
      js: String.raw`function simulateGradScaler(initScale, growthInterval, overflow) {
  let scale = initScale, goodSteps = 0, skipped = 0;   // goodSteps: PyTorch's growth tracker
  for (const bad of overflow) {
    if (bad) {                         // inf/NaN: skip the step, shrink the scale
      scale *= 0.5;
      goodSteps = 0;
      skipped++;
    } else if (++goodSteps === growthInterval) {
      scale *= 2;                      // try a bigger scale again
      goodSteps = 0;
    }
  }
  return [scale, skipped];
}`,
      cpp: String.raw`class Solution {
public:
    vector<double> simulateGradScaler(double initScale, int growthInterval, vector<bool>& overflow) {
        double scale = initScale;
        int goodSteps = 0, skipped = 0;          // goodSteps: PyTorch's growth tracker
        for (bool bad : overflow) {
            if (bad) {                           // inf/NaN: skip the step, shrink the scale
                scale *= 0.5;
                goodSteps = 0;
                skipped++;
            } else if (++goodSteps == growthInterval) {
                scale *= 2.0;                    // try a bigger scale again
                goodSteps = 0;
            }
        }
        return {scale, (double)skipped};
    }
};`,
      csharp: String.raw`public class Solution {
    public double[] SimulateGradScaler(double initScale, int growthInterval, bool[] overflow) {
        double scale = initScale;
        int goodSteps = 0, skipped = 0;          // goodSteps: PyTorch's growth tracker
        foreach (bool bad in overflow) {
            if (bad) {                           // inf/NaN: skip the step, shrink the scale
                scale *= 0.5;
                goodSteps = 0;
                skipped++;
            } else if (++goodSteps == growthInterval) {
                scale *= 2.0;                    // try a bigger scale again
                goodSteps = 0;
            }
        }
        return new double[] { scale, skipped };
    }
}`
    },
    early: {
      java: String.raw`class Solution {
    public int[] earlyStopping(double[] valLosses, int patience, double minDelta) {
        double best = valLosses[0];
        int bestEpoch = 0, waited = 0;
        for (int epoch = 1; epoch < valLosses.length; epoch++) {
            if (valLosses[epoch] < best - minDelta) {     // a real improvement, not noise
                best = valLosses[epoch]; bestEpoch = epoch; waited = 0;
            } else if (++waited >= patience) {
                return new int[] { bestEpoch, epoch };    // restore the checkpoint from bestEpoch
            }
        }
        return new int[] { bestEpoch, -1 };
    }
}`,
      js: String.raw`function earlyStopping(valLosses, patience, minDelta) {
  let best = valLosses[0], bestEpoch = 0, waited = 0;
  for (let epoch = 1; epoch < valLosses.length; epoch++) {
    if (valLosses[epoch] < best - minDelta) {      // a real improvement, not noise
      best = valLosses[epoch]; bestEpoch = epoch; waited = 0;
    } else if (++waited >= patience) {
      return [bestEpoch, epoch];                   // restore the checkpoint from bestEpoch
    }
  }
  return [bestEpoch, -1];
}`,
      cpp: String.raw`class Solution {
public:
    vector<int> earlyStopping(vector<double>& valLosses, int patience, double minDelta) {
        double best = valLosses[0];
        int bestEpoch = 0, waited = 0;
        for (int epoch = 1; epoch < (int)valLosses.size(); epoch++) {
            if (valLosses[epoch] < best - minDelta) {     // a real improvement, not noise
                best = valLosses[epoch]; bestEpoch = epoch; waited = 0;
            } else if (++waited >= patience) {
                return {bestEpoch, epoch};                // restore the checkpoint from bestEpoch
            }
        }
        return {bestEpoch, -1};
    }
};`,
      csharp: String.raw`public class Solution {
    public int[] EarlyStopping(double[] valLosses, int patience, double minDelta) {
        double best = valLosses[0];
        int bestEpoch = 0, waited = 0;
        for (int epoch = 1; epoch < valLosses.Length; epoch++) {
            if (valLosses[epoch] < best - minDelta) {     // a real improvement, not noise
                best = valLosses[epoch]; bestEpoch = epoch; waited = 0;
            } else if (++waited >= patience) {
                return new int[] { bestEpoch, epoch };    // restore the checkpoint from bestEpoch
            }
        }
        return new int[] { bestEpoch, -1 };
    }
}`
    },
    freeze: {
      java: String.raw`class Solution {
    public long[] finetuneParamCounts(int[] dims, int numClasses, boolean freezeBackbone) {
        long backbone = 0;
        for (int i = 0; i + 1 < dims.length; i++)
            backbone += (long) dims[i] * dims[i + 1] + dims[i + 1];   // weight matrix + bias
        long head = (long) dims[dims.length - 1] * numClasses + numClasses;   // always trainable
        long total = backbone + head;
        return new long[] { total, freezeBackbone ? head : total };
    }
}`,
      js: String.raw`function finetuneParamCounts(dims, numClasses, freezeBackbone) {
  let backbone = 0;
  for (let i = 0; i + 1 < dims.length; i++)
    backbone += dims[i] * dims[i + 1] + dims[i + 1];   // weight matrix + bias
  const head = dims[dims.length - 1] * numClasses + numClasses;   // always trainable
  const total = backbone + head;
  return [total, freezeBackbone ? head : total];
}`,
      cpp: String.raw`class Solution {
public:
    vector<long long> finetuneParamCounts(vector<int>& dims, int numClasses, bool freezeBackbone) {
        long long backbone = 0;
        for (size_t i = 0; i + 1 < dims.size(); i++)
            backbone += (long long)dims[i] * dims[i + 1] + dims[i + 1];   // weight matrix + bias
        long long head = (long long)dims.back() * numClasses + numClasses;   // always trainable
        long long total = backbone + head;
        return {total, freezeBackbone ? head : total};
    }
};`,
      csharp: String.raw`public class Solution {
    public long[] FinetuneParamCounts(int[] dims, int numClasses, bool freezeBackbone) {
        long backbone = 0;
        for (int i = 0; i + 1 < dims.Length; i++)
            backbone += (long)dims[i] * dims[i + 1] + dims[i + 1];   // weight matrix + bias
        long head = (long)dims[dims.Length - 1] * numClasses + numClasses;   // always trainable
        long total = backbone + head;
        return new long[] { total, freezeBackbone ? head : total };
    }
}`
    },
    diag: {
      java: String.raw`class Solution {
    public String diagnoseRun(double[] train, double[] val, double target) {
        double first = train[0], last = train[train.length - 1];
        if (last > 1.5 * first) return "diverging";
        if (last > 0.95 * first) return "not_learning";
        int best = 0;                                    // first epoch with the lowest val loss
        for (int i = 1; i < val.length; i++) if (val[i] < val[best]) best = i;
        int n = val.length;
        if (best < n - 1 && val[n - 1] > 1.1 * val[best]) return "overfitting";
        if (last > target) return "underfitting";
        return "healthy";
    }
}`,
      js: String.raw`function diagnoseRun(train, val, target) {
  const first = train[0], last = train[train.length - 1];
  if (last > 1.5 * first) return 'diverging';
  if (last > 0.95 * first) return 'not_learning';
  let best = 0;                                    // first epoch with the lowest val loss
  for (let i = 1; i < val.length; i++) if (val[i] < val[best]) best = i;
  const n = val.length;
  if (best < n - 1 && val[n - 1] > 1.1 * val[best]) return 'overfitting';
  if (last > target) return 'underfitting';
  return 'healthy';
}`,
      cpp: String.raw`class Solution {
public:
    string diagnoseRun(vector<double>& train, vector<double>& val, double target) {
        double first = train.front(), last = train.back();
        if (last > 1.5 * first) return "diverging";
        if (last > 0.95 * first) return "not_learning";
        int n = val.size(), best = 0;                    // first epoch with the lowest val loss
        for (int i = 1; i < n; i++) if (val[i] < val[best]) best = i;
        if (best < n - 1 && val[n - 1] > 1.1 * val[best]) return "overfitting";
        if (last > target) return "underfitting";
        return "healthy";
    }
};`,
      csharp: String.raw`public class Solution {
    public string DiagnoseRun(double[] train, double[] val, double target) {
        double first = train[0], last = train[train.Length - 1];
        if (last > 1.5 * first) return "diverging";
        if (last > 0.95 * first) return "not_learning";
        int n = val.Length, best = 0;                    // first epoch with the lowest val loss
        for (int i = 1; i < n; i++) if (val[i] < val[best]) best = i;
        if (best < n - 1 && val[n - 1] > 1.1 * val[best]) return "overfitting";
        if (last > target) return "underfitting";
        return "healthy";
    }
}`
    },
    dropout: {
      java: String.raw`class Solution {
    public double[] dropoutForward(double[] x, int[] mask, double p, boolean training) {
        if (!training) return x.clone();          // model.eval(): dropout is the identity
        double keep = 1.0 - p;
        double[] out = new double[x.length];      // inverted dropout: survivors scaled by 1/keep
        for (int i = 0; i < x.length; i++) out[i] = mask[i] != 0 ? x[i] / keep : 0.0;
        return out;
    }
}`,
      js: String.raw`function dropoutForward(x, mask, p, training) {
  if (!training) return x.slice();          // model.eval(): dropout is the identity
  const keep = 1 - p;                       // inverted dropout: survivors scaled by 1/keep
  return x.map((v, i) => (mask[i] ? v / keep : 0));
}`,
      cpp: String.raw`class Solution {
public:
    vector<double> dropoutForward(vector<double>& x, vector<int>& mask, double p, bool training) {
        if (!training) return x;                  // model.eval(): dropout is the identity
        double keep = 1.0 - p;                    // inverted dropout: survivors scaled by 1/keep
        vector<double> out;
        for (size_t i = 0; i < x.size(); i++) out.push_back(mask[i] ? x[i] / keep : 0.0);
        return out;
    }
};`,
      csharp: String.raw`public class Solution {
    public double[] DropoutForward(double[] x, int[] mask, double p, bool training) {
        if (!training) return (double[])x.Clone();   // model.eval(): dropout is the identity
        double keep = 1.0 - p;                       // inverted dropout: survivors scaled by 1/keep
        var output = new double[x.Length];
        for (int i = 0; i < x.Length; i++) output[i] = mask[i] != 0 ? x[i] / keep : 0.0;
        return output;
    }
}`
    },
    steplr: {
      java: String.raw`class Solution {
    public double stepLr(double baseLr, int stepSize, double gamma, int epoch) {
        return baseLr * Math.pow(gamma, epoch / stepSize);   // multiply by gamma every stepSize epochs
    }
}`,
      js: String.raw`function stepLr(baseLr, stepSize, gamma, epoch) {
  return baseLr * gamma ** Math.floor(epoch / stepSize);   // multiply by gamma every stepSize epochs
}`,
      cpp: String.raw`class Solution {
public:
    double stepLr(double baseLr, int stepSize, double gamma, int epoch) {
        return baseLr * pow(gamma, epoch / stepSize);   // multiply by gamma every stepSize epochs
    }
};`,
      csharp: String.raw`public class Solution {
    public double StepLr(double baseLr, int stepSize, double gamma, int epoch) {
        return baseLr * Math.Pow(gamma, epoch / stepSize);   // multiply by gamma every stepSize epochs
    }
}`
    },
    acc: {
      java: String.raw`class Solution {
    public double accuracy(double[][] logits, int[] labels) {
        int correct = 0;
        for (int r = 0; r < logits.length; r++) {
            int pred = 0;
            for (int k = 1; k < logits[r].length; k++)
                if (logits[r][k] > logits[r][pred]) pred = k;   // strict > keeps the FIRST max
            if (pred == labels[r]) correct++;
        }
        return (double) correct / labels.length;
    }
}`,
      js: String.raw`function accuracy(logits, labels) {
  let correct = 0;
  logits.forEach((row, r) => {
    let pred = 0;
    for (let k = 1; k < row.length; k++) if (row[k] > row[pred]) pred = k;   // strict > keeps the FIRST max
    if (pred === labels[r]) correct++;
  });
  return correct / labels.length;
}`,
      cpp: String.raw`class Solution {
public:
    double accuracy(vector<vector<double>>& logits, vector<int>& labels) {
        int correct = 0;
        for (size_t r = 0; r < logits.size(); r++) {
            int pred = 0;
            for (int k = 1; k < (int)logits[r].size(); k++)
                if (logits[r][k] > logits[r][pred]) pred = k;   // strict > keeps the FIRST max
            if (pred == labels[r]) correct++;
        }
        return (double)correct / labels.size();
    }
};`,
      csharp: String.raw`public class Solution {
    public double Accuracy(double[][] logits, int[] labels) {
        int correct = 0;
        for (int r = 0; r < logits.Length; r++) {
            int pred = 0;
            for (int k = 1; k < logits[r].Length; k++)
                if (logits[r][k] > logits[r][pred]) pred = k;   // strict > keeps the FIRST max
            if (pred == labels[r]) correct++;
        }
        return (double)correct / labels.Length;
    }
}`
    },
    steps: {
      java: String.raw`class Solution {
    public int optimizerSteps(int n, int batchSize, int accumSteps, int epochs, boolean dropLast) {
        int batches = dropLast ? n / batchSize : (n + batchSize - 1) / batchSize;   // ceil keeps the short batch
        int perEpoch = (batches + accumSteps - 1) / accumSteps;                     // a partial group still steps
        return perEpoch * epochs;
    }
}`,
      js: String.raw`function optimizerSteps(n, batchSize, accumSteps, epochs, dropLast) {
  const batches = dropLast ? Math.floor(n / batchSize) : Math.ceil(n / batchSize);   // ceil keeps the short batch
  const perEpoch = Math.ceil(batches / accumSteps);                                 // a partial group still steps
  return perEpoch * epochs;
}`,
      cpp: String.raw`class Solution {
public:
    int optimizerSteps(int n, int batchSize, int accumSteps, int epochs, bool dropLast) {
        int batches = dropLast ? n / batchSize : (n + batchSize - 1) / batchSize;   // ceil keeps the short batch
        int perEpoch = (batches + accumSteps - 1) / accumSteps;                     // a partial group still steps
        return perEpoch * epochs;
    }
};`,
      csharp: String.raw`public class Solution {
    public int OptimizerSteps(int n, int batchSize, int accumSteps, int epochs, bool dropLast) {
        int batches = dropLast ? n / batchSize : (n + batchSize - 1) / batchSize;   // ceil keeps the short batch
        int perEpoch = (batches + accumSteps - 1) / accumSteps;                     // a partial group still steps
        return perEpoch * epochs;
    }
}`
    },
    clip: {
      java: String.raw`class Solution {
    public double[] clipGradNorm(double[] grads, double maxNorm) {
        double sq = 0;                                   // one global L2 norm over ALL gradients
        for (double g : grads) sq += g * g;
        double coef = Math.min(maxNorm / (Math.sqrt(sq) + 1e-6), 1.0);   // only ever shrink
        double[] out = new double[grads.length];
        for (int i = 0; i < grads.length; i++) out[i] = grads[i] * coef;
        return out;
    }
}`,
      js: String.raw`function clipGradNorm(grads, maxNorm) {
  const total = Math.sqrt(grads.reduce((s, g) => s + g * g, 0));   // one global L2 norm
  const coef = Math.min(maxNorm / (total + 1e-6), 1);              // only ever shrink
  return grads.map((g) => g * coef);
}`,
      cpp: String.raw`class Solution {
public:
    vector<double> clipGradNorm(vector<double>& grads, double maxNorm) {
        double sq = 0;                                   // one global L2 norm over ALL gradients
        for (double g : grads) sq += g * g;
        double coef = min(maxNorm / (sqrt(sq) + 1e-6), 1.0);   // only ever shrink
        vector<double> out;
        for (double g : grads) out.push_back(g * coef);
        return out;
    }
};`,
      csharp: String.raw`public class Solution {
    public double[] ClipGradNorm(double[] grads, double maxNorm) {
        double sq = 0;                                   // one global L2 norm over ALL gradients
        foreach (double g in grads) sq += g * g;
        double coef = Math.Min(maxNorm / (Math.Sqrt(sq) + 1e-6), 1.0);   // only ever shrink
        return grads.Select(g => g * coef).ToArray();
    }
}`
    },
    cosrestart: {
      java: String.raw`class Solution {
    public double cosineWarmRestarts(double baseLr, double etaMin, int t0, int tMult, int epoch) {
        long ti = t0, tCur = epoch;
        while (tCur >= ti) {          // finished a whole cycle: restart, maybe a longer one
            tCur -= ti;
            ti *= tMult;
        }
        double cosPart = (1 + Math.cos(Math.PI * tCur / ti)) / 2;
        return etaMin + (baseLr - etaMin) * cosPart;
    }
}`,
      js: String.raw`function cosineWarmRestarts(baseLr, etaMin, t0, tMult, epoch) {
  let ti = t0, tCur = epoch;
  while (tCur >= ti) {            // finished a whole cycle: restart, maybe a longer one
    tCur -= ti;
    ti *= tMult;
  }
  const cosPart = (1 + Math.cos(Math.PI * tCur / ti)) / 2;
  return etaMin + (baseLr - etaMin) * cosPart;
}`,
      cpp: String.raw`class Solution {
public:
    double cosineWarmRestarts(double baseLr, double etaMin, int t0, int tMult, int epoch) {
        long long ti = t0, tCur = epoch;
        while (tCur >= ti) {          // finished a whole cycle: restart, maybe a longer one
            tCur -= ti;
            ti *= tMult;
        }
        double cosPart = (1 + cos(M_PI * tCur / ti)) / 2;
        return etaMin + (baseLr - etaMin) * cosPart;
    }
};`,
      csharp: String.raw`public class Solution {
    public double CosineWarmRestarts(double baseLr, double etaMin, int t0, int tMult, int epoch) {
        long ti = t0, tCur = epoch;
        while (tCur >= ti) {          // finished a whole cycle: restart, maybe a longer one
            tCur -= ti;
            ti *= tMult;
        }
        double cosPart = (1 + Math.Cos(Math.PI * tCur / ti)) / 2;
        return etaMin + (baseLr - etaMin) * cosPart;
    }
}`
    },
    ce: {
      java: String.raw`class Solution {
    public double crossEntropy(double[][] logits, int[] targets, int ignoreIndex, double labelSmoothing) {
        double total = 0;
        int count = 0;
        for (int r = 0; r < logits.length; r++) {
            int y = targets[r];
            if (y == ignoreIndex) continue;            // e.g. padding: no loss, not counted
            double[] row = logits[r];
            double m = row[0];
            for (double z : row) m = Math.max(m, z);
            double s = 0;
            for (double z : row) s += Math.exp(z - m); // log-sum-exp: never exp a big number
            double lse = m + Math.log(s), sumLogp = 0;
            for (double z : row) sumLogp += z - lse;
            double nll = -(row[y] - lse);
            double smooth = -sumLogp / row.length;     // CE against the uniform distribution
            total += (1 - labelSmoothing) * nll + labelSmoothing * smooth;
            count++;
        }
        return count > 0 ? total / count : 0.0;
    }
}`,
      js: String.raw`function crossEntropy(logits, targets, ignoreIndex, labelSmoothing) {
  let total = 0, count = 0;
  logits.forEach((row, r) => {
    const y = targets[r];
    if (y === ignoreIndex) return;                 // e.g. padding: no loss, not counted
    const m = Math.max(...row);
    const lse = m + Math.log(row.reduce((s, z) => s + Math.exp(z - m), 0));   // log-sum-exp
    const logp = row.map((z) => z - lse);          // log_softmax
    const nll = -logp[y];
    const smooth = -logp.reduce((s, v) => s + v, 0) / row.length;
    total += (1 - labelSmoothing) * nll + labelSmoothing * smooth;
    count++;
  });
  return count ? total / count : 0;
}`,
      cpp: String.raw`class Solution {
public:
    double crossEntropy(vector<vector<double>>& logits, vector<int>& targets, int ignoreIndex, double labelSmoothing) {
        double total = 0;
        int count = 0;
        for (size_t r = 0; r < logits.size(); r++) {
            int y = targets[r];
            if (y == ignoreIndex) continue;            // e.g. padding: no loss, not counted
            const vector<double>& row = logits[r];
            double m = *max_element(row.begin(), row.end());
            double s = 0;
            for (double z : row) s += exp(z - m);      // log-sum-exp: never exp a big number
            double lse = m + log(s), sumLogp = 0;
            for (double z : row) sumLogp += z - lse;
            double nll = -(row[y] - lse);
            double smooth = -sumLogp / row.size();     // CE against the uniform distribution
            total += (1 - labelSmoothing) * nll + labelSmoothing * smooth;
            count++;
        }
        return count ? total / count : 0.0;
    }
};`,
      csharp: String.raw`public class Solution {
    public double CrossEntropy(double[][] logits, int[] targets, int ignoreIndex, double labelSmoothing) {
        double total = 0;
        int count = 0;
        for (int r = 0; r < logits.Length; r++) {
            int y = targets[r];
            if (y == ignoreIndex) continue;            // e.g. padding: no loss, not counted
            double[] row = logits[r];
            double m = row.Max();
            double s = 0;
            foreach (double z in row) s += Math.Exp(z - m);   // log-sum-exp: never exp a big number
            double lse = m + Math.Log(s), sumLogp = 0;
            foreach (double z in row) sumLogp += z - lse;
            double nll = -(row[y] - lse);
            double smooth = -sumLogp / row.Length;     // CE against the uniform distribution
            total += (1 - labelSmoothing) * nll + labelSmoothing * smooth;
            count++;
        }
        return count > 0 ? total / count : 0.0;
    }
}`
    },
    plateau: {
      java: String.raw`class Solution {
    public double reduceOnPlateau(double[] valLosses, double lr, double factor, int patience, double minLr) {
        double best = Double.POSITIVE_INFINITY;
        int badEpochs = 0;
        for (double loss : valLosses) {          // scheduler.step(val_loss) once per epoch
            if (loss < best) { best = loss; badEpochs = 0; }
            else if (++badEpochs > patience) {   // MORE than patience bad epochs
                lr = Math.max(lr * factor, minLr);
                badEpochs = 0;
            }
        }
        return lr;
    }
}`,
      js: String.raw`function reduceOnPlateau(valLosses, lr, factor, patience, minLr) {
  let best = Infinity, badEpochs = 0;
  for (const loss of valLosses) {            // scheduler.step(val_loss) once per epoch
    if (loss < best) { best = loss; badEpochs = 0; }
    else if (++badEpochs > patience) {       // MORE than patience bad epochs
      lr = Math.max(lr * factor, minLr);
      badEpochs = 0;
    }
  }
  return lr;
}`,
      cpp: String.raw`class Solution {
public:
    double reduceOnPlateau(vector<double>& valLosses, double lr, double factor, int patience, double minLr) {
        double best = INFINITY;
        int badEpochs = 0;
        for (double loss : valLosses) {          // scheduler.step(val_loss) once per epoch
            if (loss < best) { best = loss; badEpochs = 0; }
            else if (++badEpochs > patience) {   // MORE than patience bad epochs
                lr = max(lr * factor, minLr);
                badEpochs = 0;
            }
        }
        return lr;
    }
};`,
      csharp: String.raw`public class Solution {
    public double ReduceOnPlateau(double[] valLosses, double lr, double factor, int patience, double minLr) {
        double best = double.PositiveInfinity;
        int badEpochs = 0;
        foreach (double loss in valLosses) {     // scheduler.step(val_loss) once per epoch
            if (loss < best) { best = loss; badEpochs = 0; }
            else if (++badEpochs > patience) {   // MORE than patience bad epochs
                lr = Math.Max(lr * factor, minLr);
                badEpochs = 0;
            }
        }
        return lr;
    }
}`
    },
    bn: {
      java: String.raw`class Solution {
    public double[] batchnormRunningStats(double[][] batches, double momentum) {
        double runningMean = 0.0, runningVar = 1.0;     // PyTorch's starting values
        for (double[] b : batches) {
            int n = b.length;
            double sum = 0;
            for (double x : b) sum += x;
            double mean = sum / n, sq = 0;
            for (double x : b) sq += (x - mean) * (x - mean);
            double var = sq / (n - 1);                  // UNBIASED variance for the running stat
            runningMean = (1 - momentum) * runningMean + momentum * mean;
            runningVar = (1 - momentum) * runningVar + momentum * var;
        }
        return new double[] { runningMean, runningVar };
    }
}`,
      js: String.raw`function batchnormRunningStats(batches, momentum) {
  let runningMean = 0, runningVar = 1;            // PyTorch's starting values
  for (const b of batches) {
    const n = b.length;
    const mean = b.reduce((s, x) => s + x, 0) / n;
    const v = b.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);   // UNBIASED variance
    runningMean = (1 - momentum) * runningMean + momentum * mean;
    runningVar = (1 - momentum) * runningVar + momentum * v;
  }
  return [runningMean, runningVar];
}`,
      cpp: String.raw`class Solution {
public:
    vector<double> batchnormRunningStats(vector<vector<double>>& batches, double momentum) {
        double runningMean = 0.0, runningVar = 1.0;     // PyTorch's starting values
        for (auto& b : batches) {
            int n = b.size();
            double sum = 0;
            for (double x : b) sum += x;
            double mean = sum / n, sq = 0;
            for (double x : b) sq += (x - mean) * (x - mean);
            double var = sq / (n - 1);                  // UNBIASED variance for the running stat
            runningMean = (1 - momentum) * runningMean + momentum * mean;
            runningVar = (1 - momentum) * runningVar + momentum * var;
        }
        return {runningMean, runningVar};
    }
};`,
      csharp: String.raw`public class Solution {
    public double[] BatchnormRunningStats(double[][] batches, double momentum) {
        double runningMean = 0.0, runningVar = 1.0;     // PyTorch's starting values
        foreach (double[] b in batches) {
            int n = b.Length;
            double sum = 0;
            foreach (double x in b) sum += x;
            double mean = sum / n, sq = 0;
            foreach (double x in b) sq += (x - mean) * (x - mean);
            double variance = sq / (n - 1);             // UNBIASED variance for the running stat
            runningMean = (1 - momentum) * runningMean + momentum * mean;
            runningVar = (1 - momentum) * runningVar + momentum * variance;
        }
        return new double[] { runningMean, runningVar };
    }
}`
    },
    accum: {
      java: String.raw`class Solution {
    public double[] trainWithAccumulation(double[] xs, double[] ys, double lr, int epochs, int microBatch, int accumSteps) {
        double w = 0, b = 0;
        int n = xs.length;
        int numBatches = (n + microBatch - 1) / microBatch;
        for (int e = 0; e < epochs; e++) {
            double gw = 0, gb = 0;                 // the .grad buffers: they ADD UP until zero_grad
            int waiting = 0;
            for (int bi = 0; bi < numBatches; bi++) {
                int lo = bi * microBatch, hi = Math.min(n, lo + microBatch), m = hi - lo;
                double dw = 0, db = 0;
                for (int i = lo; i < hi; i++) {    // gradient of this micro-batch's MEAN squared error
                    double err = w * xs[i] + b - ys[i];
                    dw += 2 * err * xs[i] / m;
                    db += 2 * err / m;
                }
                gw += dw / accumSteps;             // loss / accum_steps, then backward()
                gb += db / accumSteps;
                waiting++;
                if (waiting == accumSteps || bi == numBatches - 1) {
                    w -= lr * gw;                  // optimizer.step()
                    b -= lr * gb;
                    gw = 0; gb = 0; waiting = 0;   // optimizer.zero_grad()
                }
            }
        }
        return new double[] { w, b };
    }
}`,
      js: String.raw`function trainWithAccumulation(xs, ys, lr, epochs, microBatch, accumSteps) {
  let w = 0, b = 0;
  const n = xs.length;
  const numBatches = Math.ceil(n / microBatch);
  for (let e = 0; e < epochs; e++) {
    let gw = 0, gb = 0, waiting = 0;         // the .grad buffers: they ADD UP until zero_grad
    for (let bi = 0; bi < numBatches; bi++) {
      const lo = bi * microBatch, hi = Math.min(n, lo + microBatch), m = hi - lo;
      let dw = 0, db = 0;
      for (let i = lo; i < hi; i++) {        // gradient of this micro-batch's MEAN squared error
        const err = w * xs[i] + b - ys[i];
        dw += 2 * err * xs[i] / m;
        db += 2 * err / m;
      }
      gw += dw / accumSteps;                 // loss / accum_steps, then backward()
      gb += db / accumSteps;
      waiting++;
      if (waiting === accumSteps || bi === numBatches - 1) {
        w -= lr * gw;                        // optimizer.step()
        b -= lr * gb;
        gw = gb = 0; waiting = 0;            // optimizer.zero_grad()
      }
    }
  }
  return [w, b];
}`,
      cpp: String.raw`class Solution {
public:
    vector<double> trainWithAccumulation(vector<double>& xs, vector<double>& ys, double lr, int epochs, int microBatch, int accumSteps) {
        double w = 0, b = 0;
        int n = xs.size();
        int numBatches = (n + microBatch - 1) / microBatch;
        for (int e = 0; e < epochs; e++) {
            double gw = 0, gb = 0;                 // the .grad buffers: they ADD UP until zero_grad
            int waiting = 0;
            for (int bi = 0; bi < numBatches; bi++) {
                int lo = bi * microBatch, hi = min(n, lo + microBatch), m = hi - lo;
                double dw = 0, db = 0;
                for (int i = lo; i < hi; i++) {    // gradient of this micro-batch's MEAN squared error
                    double err = w * xs[i] + b - ys[i];
                    dw += 2 * err * xs[i] / m;
                    db += 2 * err / m;
                }
                gw += dw / accumSteps;             // loss / accum_steps, then backward()
                gb += db / accumSteps;
                waiting++;
                if (waiting == accumSteps || bi == numBatches - 1) {
                    w -= lr * gw;                  // optimizer.step()
                    b -= lr * gb;
                    gw = gb = 0; waiting = 0;      // optimizer.zero_grad()
                }
            }
        }
        return {w, b};
    }
};`,
      csharp: String.raw`public class Solution {
    public double[] TrainWithAccumulation(double[] xs, double[] ys, double lr, int epochs, int microBatch, int accumSteps) {
        double w = 0, b = 0;
        int n = xs.Length;
        int numBatches = (n + microBatch - 1) / microBatch;
        for (int e = 0; e < epochs; e++) {
            double gw = 0, gb = 0;                 // the .grad buffers: they ADD UP until zero_grad
            int waiting = 0;
            for (int bi = 0; bi < numBatches; bi++) {
                int lo = bi * microBatch, hi = Math.Min(n, lo + microBatch), m = hi - lo;
                double dw = 0, db = 0;
                for (int i = lo; i < hi; i++) {    // gradient of this micro-batch's MEAN squared error
                    double err = w * xs[i] + b - ys[i];
                    dw += 2 * err * xs[i] / m;
                    db += 2 * err / m;
                }
                gw += dw / accumSteps;             // loss / accum_steps, then backward()
                gb += db / accumSteps;
                waiting++;
                if (waiting == accumSteps || bi == numBatches - 1) {
                    w -= lr * gw;                  // optimizer.step()
                    b -= lr * gb;
                    gw = gb = 0; waiting = 0;      // optimizer.zero_grad()
                }
            }
        }
        return new double[] { w, b };
    }
}`
    },
    resume: {
      java: String.raw`class Solution {
    public double trainAndResume(double w0, double a, double c, double lr, double momentum, int stepSize,
                                 double gamma, int totalSteps, int crashStep, boolean restoreOptimizer) {
        // minimise a * (w - c)^2 with SGD + momentum and StepLR; at crashStep "reload a checkpoint"
        double w = w0;
        Double buf = null;                       // PyTorch creates the buffer on the first step
        for (int t = 0; t < totalSteps; t++) {
            if (t == crashStep && !restoreOptimizer) buf = null;   // fresh optimizer: velocity lost
            double g = 2 * a * (w - c);
            buf = buf == null ? g : momentum * buf + g;
            double curLr = lr * Math.pow(gamma, t / stepSize);
            w -= curLr * buf;
        }
        return w;
    }
}`,
      js: String.raw`function trainAndResume(w0, a, c, lr, momentum, stepSize, gamma, totalSteps, crashStep, restoreOptimizer) {
  // minimise a * (w - c)^2 with SGD + momentum and StepLR; at crashStep "reload a checkpoint"
  let w = w0, buf = null;                  // PyTorch creates the buffer on the first step
  for (let t = 0; t < totalSteps; t++) {
    if (t === crashStep && !restoreOptimizer) buf = null;   // fresh optimizer: velocity lost
    const g = 2 * a * (w - c);
    buf = buf === null ? g : momentum * buf + g;
    const curLr = lr * gamma ** Math.floor(t / stepSize);
    w -= curLr * buf;
  }
  return w;
}`,
      cpp: String.raw`class Solution {
public:
    double trainAndResume(double w0, double a, double c, double lr, double momentum, int stepSize,
                          double gamma, int totalSteps, int crashStep, bool restoreOptimizer) {
        // minimise a * (w - c)^2 with SGD + momentum and StepLR; at crashStep "reload a checkpoint"
        double w = w0, buf = 0;
        bool hasBuf = false;                     // PyTorch creates the buffer on the first step
        for (int t = 0; t < totalSteps; t++) {
            if (t == crashStep && !restoreOptimizer) hasBuf = false;   // fresh optimizer: velocity lost
            double g = 2 * a * (w - c);
            buf = hasBuf ? momentum * buf + g : g;
            hasBuf = true;
            double curLr = lr * pow(gamma, t / stepSize);
            w -= curLr * buf;
        }
        return w;
    }
};`,
      csharp: String.raw`public class Solution {
    public double TrainAndResume(double w0, double a, double c, double lr, double momentum, int stepSize,
                                 double gamma, int totalSteps, int crashStep, bool restoreOptimizer) {
        // minimise a * (w - c)^2 with SGD + momentum and StepLR; at crashStep "reload a checkpoint"
        double w = w0;
        double? buf = null;                      // PyTorch creates the buffer on the first step
        for (int t = 0; t < totalSteps; t++) {
            if (t == crashStep && !restoreOptimizer) buf = null;   // fresh optimizer: velocity lost
            double g = 2 * a * (w - c);
            buf = buf.HasValue ? momentum * buf.Value + g : g;
            double curLr = lr * Math.Pow(gamma, t / stepSize);
            w -= curLr * buf.Value;
        }
        return w;
    }
}`
    },
    fit: {
      java: String.raw`class Solution {
    public double[] fitWithEarlyStopping(double[] xTrain, double[] yTrain, double[] xVal, double[] yVal,
                                         double lr, int batchSize, int maxEpochs, int patience, int seed) {
        double w = 0, b = 0;
        int n = xTrain.length;
        long state = seed;                                  // ONE generator for the whole run
        double bestLoss = Double.POSITIVE_INFINITY, bestW = 0, bestB = 0;
        int bestEpoch = -1, bad = 0;
        for (int epoch = 0; epoch < maxEpochs; epoch++) {
            int[] idx = new int[n];                         // a new shuffle every epoch
            for (int i = 0; i < n; i++) idx[i] = i;
            for (int i = n - 1; i > 0; i--) {
                state = Long.remainderUnsigned(state * 1103515245L + 12345L, 2147483648L);
                int j = (int) Long.remainderUnsigned(state, i + 1);
                int t = idx[i]; idx[i] = idx[j]; idx[j] = t;
            }
            for (int start = 0; start < n; start += batchSize) {   // one SGD step per batch
                int end = Math.min(n, start + batchSize), len = end - start;
                double dw = 0, db = 0;
                for (int k = start; k < end; k++) {
                    int i = idx[k];
                    double err = w * xTrain[i] + b - yTrain[i];
                    dw += 2 * err * xTrain[i] / len;
                    db += 2 * err / len;
                }
                w -= lr * dw;
                b -= lr * db;
            }
            double s = 0;                                   // eval: measure, never update
            for (int i = 0; i < xVal.length; i++) {
                double e = w * xVal[i] + b - yVal[i];
                s += e * e;
            }
            double val = s / xVal.length;
            if (val < bestLoss) {                           // "save checkpoint"
                bestLoss = val; bestEpoch = epoch; bestW = w; bestB = b; bad = 0;
            } else if (++bad >= patience) break;
        }
        return new double[] { bestEpoch, bestLoss, bestW, bestB };   // "load the best checkpoint"
    }
}`,
      js: String.raw`function fitWithEarlyStopping(xTrain, yTrain, xVal, yVal, lr, batchSize, maxEpochs, patience, seed) {
  let w = 0, b = 0;
  const n = xTrain.length;
  let state = BigInt(seed);                        // ONE generator for the whole run (BigInt: products pass 2^53)
  let bestLoss = Infinity, bestEpoch = -1, bestW = 0, bestB = 0, bad = 0;
  for (let epoch = 0; epoch < maxEpochs; epoch++) {
    const idx = Array.from({ length: n }, (_, i) => i);   // a new shuffle every epoch
    for (let i = n - 1; i > 0; i--) {
      state = (state * 1103515245n + 12345n) % 2147483648n;
      const j = Number(state % BigInt(i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    for (let start = 0; start < n; start += batchSize) {  // one SGD step per batch
      const batch = idx.slice(start, start + batchSize);
      let dw = 0, db = 0;
      for (const i of batch) {
        const err = w * xTrain[i] + b - yTrain[i];
        dw += 2 * err * xTrain[i] / batch.length;
        db += 2 * err / batch.length;
      }
      w -= lr * dw;
      b -= lr * db;
    }
    let s = 0;                                     // eval: measure, never update
    xVal.forEach((x, i) => { s += (w * x + b - yVal[i]) ** 2; });
    const val = s / xVal.length;
    if (val < bestLoss) {                          // "save checkpoint"
      bestLoss = val; bestEpoch = epoch; bestW = w; bestB = b; bad = 0;
    } else if (++bad >= patience) break;
  }
  return [bestEpoch, bestLoss, bestW, bestB];     // "load the best checkpoint"
}`,
      cpp: String.raw`class Solution {
public:
    vector<double> fitWithEarlyStopping(vector<double>& xTrain, vector<double>& yTrain, vector<double>& xVal,
                                        vector<double>& yVal, double lr, int batchSize, int maxEpochs, int patience, int seed) {
        double w = 0, b = 0;
        int n = xTrain.size();
        uint64_t state = seed;                              // ONE generator for the whole run
        double bestLoss = INFINITY, bestW = 0, bestB = 0;
        int bestEpoch = -1, bad = 0;
        for (int epoch = 0; epoch < maxEpochs; epoch++) {
            vector<int> idx(n);                             // a new shuffle every epoch
            for (int i = 0; i < n; i++) idx[i] = i;
            for (int i = n - 1; i > 0; i--) {
                state = (state * 1103515245ULL + 12345ULL) % 2147483648ULL;
                int j = (int)(state % (uint64_t)(i + 1));
                swap(idx[i], idx[j]);
            }
            for (int start = 0; start < n; start += batchSize) {   // one SGD step per batch
                int end = min(n, start + batchSize), len = end - start;
                double dw = 0, db = 0;
                for (int k = start; k < end; k++) {
                    int i = idx[k];
                    double err = w * xTrain[i] + b - yTrain[i];
                    dw += 2 * err * xTrain[i] / len;
                    db += 2 * err / len;
                }
                w -= lr * dw;
                b -= lr * db;
            }
            double s = 0;                                   // eval: measure, never update
            for (size_t i = 0; i < xVal.size(); i++) {
                double e = w * xVal[i] + b - yVal[i];
                s += e * e;
            }
            double val = s / xVal.size();
            if (val < bestLoss) {                           // "save checkpoint"
                bestLoss = val; bestEpoch = epoch; bestW = w; bestB = b; bad = 0;
            } else if (++bad >= patience) break;
        }
        return {(double)bestEpoch, bestLoss, bestW, bestB};   // "load the best checkpoint"
    }
};`,
      csharp: String.raw`public class Solution {
    public double[] FitWithEarlyStopping(double[] xTrain, double[] yTrain, double[] xVal, double[] yVal,
                                         double lr, int batchSize, int maxEpochs, int patience, int seed) {
        double w = 0, b = 0;
        int n = xTrain.Length;
        ulong state = (ulong)seed;                          // ONE generator for the whole run
        double bestLoss = double.PositiveInfinity, bestW = 0, bestB = 0;
        int bestEpoch = -1, bad = 0;
        for (int epoch = 0; epoch < maxEpochs; epoch++) {
            int[] idx = Enumerable.Range(0, n).ToArray();   // a new shuffle every epoch
            for (int i = n - 1; i > 0; i--) {
                state = unchecked(state * 1103515245UL + 12345UL) % 2147483648UL;
                int j = (int)(state % (ulong)(i + 1));
                int t = idx[i]; idx[i] = idx[j]; idx[j] = t;
            }
            for (int start = 0; start < n; start += batchSize) {   // one SGD step per batch
                int end = Math.Min(n, start + batchSize), len = end - start;
                double dw = 0, db = 0;
                for (int k = start; k < end; k++) {
                    int i = idx[k];
                    double err = w * xTrain[i] + b - yTrain[i];
                    dw += 2 * err * xTrain[i] / len;
                    db += 2 * err / len;
                }
                w -= lr * dw;
                b -= lr * db;
            }
            double s = 0;                                   // eval: measure, never update
            for (int i = 0; i < xVal.Length; i++) {
                double e = w * xVal[i] + b - yVal[i];
                s += e * e;
            }
            double val = s / xVal.Length;
            if (val < bestLoss) {                           // "save checkpoint"
                bestLoss = val; bestEpoch = epoch; bestW = w; bestB = b; bad = 0;
            } else if (++bad >= patience) break;
        }
        return new double[] { bestEpoch, bestLoss, bestW, bestB };   // "load the best checkpoint"
    }
}`
    }
  };

  var TESTS = {"bcast":{"sig":"int[] int[] -> int[]","fn":"broadcastShape","cmp":"exact","cases":[[[[3,1],[1,4]],[3,4]],[[[8,1,6,1],[7,1,5]],[8,7,6,5]],[[[5],[]],[5]],[[[],[]],[]],[[[2,3],[3,2]],[-1]],[[[4,3],[3]],[4,3]],[[[4,3],[4]],[-1]],[[[0,1],[1,5]],[0,5]],[[[0],[3]],[-1]],[[[1],[1,1,1]],[1,1,1]],[[[256,256,3],[3]],[256,256,3]]]},"engine":{"sig":"double[] string[] -> double[]","fn":"backpropGraph","cmp":"float","cases":[[[[2,3,4],["mul 0 1","add 3 2"]],[3,2,1]],[[[2],["mul 0 0"]],[4]],[[[-1.5,2],["mul 0 1","relu 2"]],[0,0]],[[[1.5,2],["mul 0 1","relu 2"]],[2,1.5]],[[[0.5],["tanh 0"]],[0.7864477329659274]],[[[2,-3,10],["mul 0 1","add 3 2","mul 4 0"]],[-2,4,2]],[[[3,4],["add 0 1","mul 2 0","mul 3 1","tanh 4"]],[0,0]],[[[1,2,3],["add 0 1","add 3 2","mul 4 4"]],[12,12,12]],[[[0.3,-0.2,0.7],["mul 0 1","add 3 2","tanh 4","mul 5 5"]],[-0.15385344258932238,0.23078016388398354,0.7692672129466118]]]},"batches":{"sig":"int int bool bool int -> int[][]","fn":"makeBatches","cmp":"exact","cases":[[[5,2,false,false,0],[[0,1],[2,3],[4]]],[[5,2,false,true,0],[[0,1],[2,3]]],[[6,3,false,false,0],[[0,1,2],[3,4,5]]],[[0,4,false,false,1],[]],[[3,10,false,true,1],[]],[[3,10,false,false,1],[[0,1,2]]],[[5,2,true,false,42],[[1,3],[4,0],[2]]],[[4,4,true,false,7],[[1,2,3,0]]],[[6,4,true,true,123],[[1,4,3,2]]],[[1,1,true,false,9],[[0]]]]},"sgd":{"sig":"double[] double[] double[] double double double bool -> double[][]","fn":"sgdMomentumStep","cmp":"float","cases":[[[[1],[0.5],[0],0.1,0.9,0,false],[[0.95],[0.5]]],[[[1],[0.5],[0.5],0.1,0.9,0,false],[[0.905],[0.95]]],[[[1,-2],[0.2,0.4],[0,0],0.1,0,0,false],[[0.98,-2.04],[0.2,0.4]]],[[[2],[0],[0],0.5,0.9,0.1,false],[[1.9],[0.2]]],[[[1],[0.5],[0.5],0.1,0.9,0,true],[[0.8645],[0.95]]],[[[3,4],[1,-1],[0.2,0.2],0.01,0.9,0.01,true],[[2.97881,4.01662],[1.21,-0.7799999999999999]]],[[[0],[0],[1],1,0.5,0,false],[[-0.5],[0.5]]]]},"scaler":{"sig":"double int bool[] -> double[]","fn":"simulateGradScaler","cmp":"float","cases":[[[65536,2000,[]],[65536,0]],[[65536,2000,[true]],[32768,1]],[[65536,2,[false,false]],[131072,0]],[[65536,2,[false,true,false,false]],[65536,1]],[[1024,3,[true,true,false,false,false,false]],[512,2]],[[8,1,[false,false,false]],[64,0]],[[65536,2000,[true,true,true,true]],[4096,4]],[[16,2,[false,true,false,true,false,false]],[8,2]]]},"early":{"sig":"double[] int double -> int[]","fn":"earlyStopping","cmp":"exact","cases":[[[[1,0.8,0.7,0.71,0.72,0.73],2,0],[2,4]],[[[1,0.8,0.7,0.69,0.68,0.75],2,0.05],[2,4]],[[[0.5],3,0],[0,-1]],[[[1,0.9,0.8,0.7],1,0],[3,-1]],[[[1,1,1],1,0],[0,1]],[[[1,0.995,0.99,0.985],2,0.01],[0,2]],[[[2,1.5,1.6,1.2,1.3,1.4,1.5],3,0],[3,6]]]},"freeze":{"sig":"int[] int bool -> long[]","fn":"finetuneParamCounts","cmp":"exact","cases":[[[[768,512,256],2,true],[525570,514]],[[[768,512,256],2,false],[525570,525570]],[[[4,3],2,true],[23,8]],[[[10],5,true],[55,55]],[[[10],5,false],[55,55]],[[[2048],1000,true],[2049000,2049000]],[[[784,128,64],10,false],[109386,109386]]]},"diag":{"sig":"double[] double[] double -> string","fn":"diagnoseRun","cmp":"exact","cases":[[[[2.3,5,40],[2.3,6,50],0.1],"diverging"],[[[2.3,2.3,2.29],[2.3,2.3,2.3],0.1],"not_learning"],[[[2,1,0.5,0.1],[2,1.2,1,1.3],0.2],"overfitting"],[[[2,1,0.5,0.1],[2,1.2,1,1.05],0.2],"healthy"],[[[2,1.5,1.2,1],[2,1.6,1.3,1.1],0.2],"underfitting"],[[[2,1,0.5,0.1],[2,1.1,0.6,0.2],0.2],"healthy"],[[[1,0.95],[1,0.9],0.5],"underfitting"],[[[1,1.6],[1,1.7],0.5],"diverging"],[[[1,1.5],[1,1.4],0.5],"not_learning"]]},"dropout":{"sig":"double[] int[] double bool -> double[]","fn":"dropoutForward","cmp":"float","cases":[[[[1,2,3,4],[1,0,1,0],0.5,true],[2,0,6,0]],[[[1,2,3,4],[1,0,1,0],0.5,false],[1,2,3,4]],[[[2,2],[1,1],0.2,true],[2.5,2.5]],[[[5],[0],0.9,true],[0]],[[[],[],0.5,true],[]],[[[-1,0.5,3],[1,1,0],0.25,true],[-1.3333333333333333,0.6666666666666666,0]]]},"steplr":{"sig":"double int double int -> double","fn":"stepLr","cmp":"float","cases":[[[0.1,30,0.1,0],0.1],[[0.1,30,0.1,29],0.1],[[0.1,30,0.1,30],0.010000000000000002],[[0.1,30,0.1,95],0.00010000000000000003],[[1,1,0.5,3],0.125],[[0.01,10,1,100],0.01],[[0.5,2,0.9,5],0.405]]},"acc":{"sig":"double[][] int[] -> double","fn":"accuracy","cmp":"float","cases":[[[[[2,1],[0,3]],[0,1]],1],[[[[2,1],[0,3]],[1,0]],0],[[[[1,1,1]],[0]],1],[[[[1,1,1]],[2]],0],[[[[0.1,0.2,0.7],[0.5,0.3,0.2],[0.3,0.3,0.4],[-1,-2,-0.5]],[2,0,1,2]],0.75],[[[[5]],[0]],1]]},"steps":{"sig":"int int int int bool -> int","fn":"optimizerSteps","cmp":"exact","cases":[[[1000,32,1,1,false],32],[[1000,32,1,1,true],31],[[1000,32,4,3,false],24],[[1000,32,4,3,true],24],[[10,10,1,5,false],5],[[5,10,1,2,true],0],[[5,10,1,2,false],2],[[64,8,3,1,false],3]]},"clip":{"sig":"double[] double -> double[]","fn":"clipGradNorm","cmp":"float","cases":[[[[3,4],1],[0.599999880000024,0.799999840000032]],[[[3,4],10],[3,4]],[[[3,4],5],[2.99999940000012,3.99999920000016]],[[[0,0],1],[0,0]],[[[6,8,0],2.5],[1.4999998500000151,1.99999980000002,0]],[[[-1],0.5],[-0.49999950000050003]],[[[1,1,1,1],1],[0.499999750000125,0.499999750000125,0.499999750000125,0.499999750000125]]]},"cosrestart":{"sig":"double double int int int -> double","fn":"cosineWarmRestarts","cmp":"float","cases":[[[0.1,0,10,1,0],0.1],[[0.1,0,10,1,5],0.05],[[0.1,0,10,1,10],0.1],[[0.1,0.001,10,2,15],0.0855017856687341],[[0.1,0.001,10,2,30],0.1],[[1,0,4,2,13],0.9903926402016152],[[1,0,4,1,7],0.14644660940672627],[[0.01,0,1,1,3],0.01]]},"ce":{"sig":"double[][] int[] int double -> double","fn":"crossEntropy","cmp":"float","cases":[[[[[0,0]],[0],-100,0],0.6931471805599453],[[[[2,1,0.1]],[0],-100,0],0.41703001627783376],[[[[2,1,0.1],[0.5,2.5,0.3]],[0,1],-100,0],0.31853976964918584],[[[[2,1,0.1],[0.5,2.5,0.3]],[0,-100],-100,0],0.41703001627783376],[[[[2,1,0.1]],[0],-100,0.1],0.5136966829445004],[[[[1000,0]],[1],-100,0],1000],[[[[1,2]],[-100],-100,0],0],[[[[3,1],[1,3],[0,0]],[0,0,1],-100,0.2],0.9823344008819636]]},"plateau":{"sig":"double[] double double int double -> double","fn":"reduceOnPlateau","cmp":"float","cases":[[[[1,0.9,0.8],0.1,0.1,2,0],0.1],[[[1,1,1,1],0.1,0.1,2,0],0.010000000000000002],[[[1,1,1],0.1,0.1,2,0],0.1],[[[1,1,1,1,1,1,1],0.1,0.5,2,0],0.025],[[[1,1,1,1,1,1,1],0.1,0.1,0,0.0005],0.0005],[[[5,4,4.5,4.2,4.1,3.9,4,4,4],1,0.5,1,0],0.25],[[[2],0.01,0.1,0,0],0.01]]},"bn":{"sig":"double[][] double -> double[]","fn":"batchnormRunningStats","cmp":"float","cases":[[[[],0.1],[0,1]],[[[[1,3]],0.1],[0.2,1.1]],[[[[1,3]],1],[2,2]],[[[[2,4,6],[0,0,0]],0.1],[0.36000000000000004,1.1700000000000002]],[[[[1,2,3,4],[5,5,5,5],[-2,2]],0.5],[1.5625,4.333333333333333]],[[[[10,10]],0.1],[1,0.9]]]},"accum":{"sig":"double[] double[] double int int int -> double[]","fn":"trainWithAccumulation","cmp":"float","cases":[[[[1,2,3,4],[3,5,7,9],0.05,1,2,1],[2.5475000000000003,0.9325000000000001]],[[[1,2,3,4],[3,5,7,9],0.05,1,2,2],[1.75,0.6000000000000001]],[[[1,2,3,4],[3,5,7,9],0.05,1,4,1],[1.75,0.6000000000000001]],[[[1,2,3,4],[3,5,7,9],0.05,50,1,4],[2.0458560156699397,0.8651777219412482]],[[[1,2,3,4,5],[2,4,6,8,10],0.02,3,2,2],[1.8247252351999999,0.47054671104]],[[[0,1],[1,1],0.1,10,1,1],[0.16906381596624417,0.8759099737942944]],[[[2],[4],0.1,2,1,3],[0.888888888888889,0.4444444444444445]]]},"resume":{"sig":"double double double double double int double int int bool -> double","fn":"trainAndResume","cmp":"float","cases":[[[0,1,3,0.1,0.9,100,1,1,0,true],0.6000000000000001],[[0,1,3,0.1,0.9,100,1,2,1,true],1.62],[[0,1,3,0.1,0.9,100,1,2,1,false],1.08],[[0,1,3,0.1,0.9,2,0.5,5,3,true],3.1179900000000003],[[0,1,3,0.1,0.9,2,0.5,5,3,false],2.36577],[[5,0.5,-1,0.2,0.5,3,0.1,8,8,false],0.5267618830261758],[[1,2,0,0.05,0,10,1,6,2,false],0.26214400000000004],[[10,1,0,0.1,0.8,4,0.5,10,0,false],-2.604043200000001]]},"fit":{"sig":"double[] double[] double[] double[] double int int int int -> double[]","fn":"fitWithEarlyStopping","cmp":"float","cases":[[[[1,2,3,4],[2,4,6,8],[5],[10],0.02,2,5,2,1],[4,0.2067498547055926,1.7964982724179106,0.5628110959052233]],[[[1,2,3,4],[2,4,6,8],[5],[10],0.02,4,3,2,7],[2,10.544827398399999,1.2668,0.41872000000000004]],[[[0,1,2,3],[1,3,5,7],[4,5],[9,11],0.05,1,20,3,42],[0,0.0020022250000001182,1.9716999999999998,1.0849]],[[[1,2,3],[1,2,3],[4],[4],0.5,1,10,1,3],[0,1764,10,6]],[[[1,2,3],[2,2,2],[1,2],[2,2],0.1,3,4,1,0],[0,0.32000000000000006,0.7999999999999999,0.4]],[[[1,2,3,4,5,6],[2,1,4,3,6,5],[2,4],[1.5,3.5],0.01,2,30,2,5],[1,0.049064146720945924,0.793936964496,0.199442857932]]]}};

  // ===================== TOPIC 1: TENSORS =====================
  topics.push({
    title: 'Tensors, Shapes, dtypes and Broadcasting',
    analogy: `<p>A tensor is a <b>spreadsheet that can have any number of dimensions</b>. A single number is one cell, a list is one column, a table is a sheet, and a stack of sheets is a workbook. A batch of 32 colour images of 224×224 pixels is just a workbook with 4 "directions": 32 images × 3 colour channels × 224 rows × 224 columns. Broadcasting is like writing one value in a header cell and letting it apply down the whole column without copying it into every row.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> In ai05 and ai20 you did neural-network maths with plain Python lists, one number at a time. PyTorch does the same maths on <b>tensors</b>: n-dimensional arrays that live on a CPU or a GPU, and can remember how they were computed so gradients come for free (next topic).</p>
      <h4>Three things every tensor has</h4>
      ${H.table(['property', 'what it means', 'example'], [
        ['<code>shape</code>', 'size along each dimension', '<code>torch.Size([32, 3, 224, 224])</code>'],
        ['<code>dtype</code>', 'number type of every element', '<code>torch.float32</code> (default), <code>bfloat16</code>, <code>int64</code> (class labels), <code>bool</code>'],
        ['<code>device</code>', 'where the memory lives', '<code>cpu</code>, <code>cuda:0</code>, <code>mps</code> (Apple GPUs)']
      ])}
      <h4>Naming the dimensions in your head</h4>
      <p>Most bugs are shape bugs, so say the shape out loud. Conventions: images are <code>(N, C, H, W)</code> (batch, channels, height, width); text is <code>(B, T)</code> token ids and <code>(B, T, D)</code> after the embedding (batch, time/sequence, model dimension); classifier output is <code>(N, num_classes)</code> <b>logits</b> (raw scores, before softmax).</p>
      <h4>Reshaping without copying</h4>
      <p><code>x.view(32, -1)</code> reinterprets the same memory with a new shape (−1 means "work it out"). <code>reshape</code> does the same but copies if it must. <code>permute(0, 2, 3, 1)</code> reorders dimensions (NCHW → NHWC) and leaves the tensor <i>non-contiguous</i>, so a following <code>view</code> fails until you call <code>.contiguous()</code>. <code>unsqueeze(0)</code> adds a size-1 dim (one image → a batch of one); <code>squeeze</code> removes them.</p>
      <h4>Broadcasting: maths on different shapes</h4>
      <p>Adding a bias of shape <code>(10,)</code> to logits of shape <code>(32, 10)</code> works without a loop: PyTorch lines the shapes up <b>from the right</b>, and each pair of sizes must be <b>equal</b> or <b>one of them is 1</b> (a missing dimension counts as 1). Size-1 dims are stretched virtually: no memory is copied.</p>
      ${H.table(['A', 'B', 'result'], [['(32, 10)', '(10,)', '<span class="c-g">(32, 10)</span>'], ['(8, 1, 6, 1)', '(7, 1, 5)', '<span class="c-g">(8, 7, 6, 5)</span>'], ['(3, 1)', '(1, 4)', '<span class="c-g">(3, 4)</span> — an outer sum'], ['(2, 3)', '(3, 2)', '<span class="c-r">error</span>: 3 vs 2']])}
      <p>Broadcasting is also the #1 <b>silent</b> bug: predictions of shape <code>(N, 1)</code> minus targets of shape <code>(N,)</code> broadcast to <code>(N, N)</code>, and MSE happily averages N² wrong numbers. PyTorch's <code>MSELoss</code> prints a warning for this; your own maths will not.</p>`,
    clues: [
      '"RuntimeError: The size of tensor a (3) must match the size of tensor b (2) at non-singleton dimension 1" → a broadcasting mismatch: compare shapes from the right',
      '"mat1 and mat2 shapes cannot be multiplied (32x512 and 256x10)" → the in_features of a Linear layer does not match the flattened input',
      '"view size is not compatible with input tensor\'s size and stride" → the tensor is non-contiguous (after permute/transpose): use reshape or .contiguous()',
      'Loss is weirdly large or the model learns nothing, with a (N, 1) vs (N,) pair → silent broadcast to (N, N)',
      '"Expected input batch_size (64) to match target batch_size (32)" → a flatten or view merged the wrong dimensions',
      '"expected scalar type Long but found Float" → class targets for CrossEntropyLoss must be int64 indices'
    ],
    code: { lang: 'python', title: 'Tensor basics in PyTorch 2.x (shown, not run here)', code: `import torch

x = torch.randn(32, 3, 224, 224)          # a batch of 32 RGB images, float32 on the CPU
print(x.shape, x.dtype, x.device)          # torch.Size([32, 3, 224, 224]) torch.float32 cpu

flat = x.view(32, -1)                      # (32, 150528): same memory, new shape
nhwc = x.permute(0, 2, 3, 1)               # (32, 224, 224, 3): non-contiguous view
flat2 = nhwc.reshape(32, -1)               # reshape copies when it has to (view would fail)

logits = torch.randn(32, 10)
bias = torch.zeros(10)
out = logits + bias                         # broadcast (32, 10) + (10,) -> (32, 10)

row = torch.arange(3).unsqueeze(1)          # (3, 1)
col = torch.arange(4).unsqueeze(0)          # (1, 4)
print((row + col).shape)                    # torch.Size([3, 4]): an "outer sum"

labels = torch.tensor([1, 0, 3])            # int64 class indices (what CrossEntropyLoss wants)
pred = torch.randn(3, 1)
target = torch.randn(3)
bad = (pred - target) ** 2                  # (3, 3)!  silent broadcasting bug
good = (pred.squeeze(1) - target) ** 2      # (3,) as intended

# from/to NumPy shares memory on the CPU (no copy)
import numpy as np
a = np.ones(3)
t = torch.from_numpy(a)                     # float64, shares a's buffer
` },
    viz: {
      title: 'Broadcasting two shapes, right to left',
      input: '8 1 6 1 | 7 1 5',
      inputLabel: 'shape A | shape B (sizes separated by spaces, up to 5 dims each)',
      gen: function (input) {
        var p = splitBar(input, 2, '8 1 6 1 | 7 1 5');
        var a = ints(p[0], 'shape A', 5), b = ints(p[1], 'shape B', 5), F = [];
        var n = Math.max(a.length, b.length);
        var pa = [], pb = [];
        for (var i = 0; i < n; i++) { pa.push(i < n - a.length ? '(1)' : a[i - (n - a.length)]); pb.push(i < n - b.length ? '(1)' : b[i - (n - b.length)]); }
        F.push({ narr: 'Shapes A = (' + a.join(', ') + ') and B = (' + b.join(', ') + '). Rule: line them up on the <b>right</b>. A missing dimension on the left counts as size <b>1</b>, shown as (1).', parts: [
          { type: 'array', label: 'A (padded)', values: pa.slice() }, { type: 'array', label: 'B (padded)', values: pb.slice() }] });
        var out = [], ok = true;
        for (var k = n - 1; k >= 0; k--) {
          var x = pa[k] === '(1)' ? 1 : pa[k], y = pb[k] === '(1)' ? 1 : pb[k], r, why;
          if (x === y) { r = x; why = 'equal sizes: nothing to stretch'; }
          else if (y === 1) { r = x; why = 'B has 1 here, so B is <b>stretched</b> to ' + x + ' (no copy)'; }
          else if (x === 1) { r = y; why = 'A has 1 here, so A is <b>stretched</b> to ' + y + ' (no copy)'; }
          else { ok = false; }
          if (!ok) {
            F.push({ narr: 'Dim ' + k + ': ' + x + ' vs ' + y + '. Neither is 1 and they differ, so PyTorch raises <span class="c-r">RuntimeError: The size of tensor a must match the size of tensor b</span>. Fix it with unsqueeze, view, or by checking which dim you meant.', parts: [
              { type: 'array', label: 'A (padded)', values: pa.slice(), hl: one(k, 'bad') }, { type: 'array', label: 'B (padded)', values: pb.slice(), hl: one(k, 'bad') }] });
            break;
          }
          out.unshift(r);
          F.push({ narr: 'Dim ' + k + ': ' + x + ' vs ' + y + ' → ' + r + '. ' + why + '.', parts: [
            { type: 'array', label: 'A (padded)', values: pa.slice(), hl: one(k, 'cur') }, { type: 'array', label: 'B (padded)', values: pb.slice(), hl: one(k, 'cur') },
            { type: 'array', label: 'result so far (built right to left)', values: out.slice(), hl: one(0, 'ok') }] });
        }
        if (ok) F.push({ narr: 'Result shape: <b>(' + out.join(', ') + ')</b>. It has ' + out.reduce(function (s, v) { return s * v; }, 1) + ' elements, but A and B were never copied: stretched dims use a stride of 0 in memory.', parts: [
          { type: 'array', label: 'broadcast result', values: out.slice(), hl: (function () { var o = {}; out.forEach(function (_, i) { o[i] = 'sel'; }); return o; })() }] });
        if (F.length < 4) F.push({ narr: 'Tip: when a shape error appears, print <code>a.shape, b.shape</code> right before the line and compare them from the right like this.', parts: [{ type: 'text', label: 'debug habit', html: 'print(a.shape, b.shape)' }] });
        return F;
      }
    },
    examples: [
      { title: 'Adding a per-class bias to a batch of logits', html: `<p>Logits <code>(32, 10)</code> + bias <code>(10,)</code>. Right-align: 10 vs 10 equal; 32 vs missing (=1) → stretched. Result <code>(32, 10)</code>. This is exactly what <code>nn.Linear</code> does inside: <code>x @ W.T + b</code>.</p>` },
      { title: 'Normalising images per channel', html: `<p>Images <code>(N, 3, H, W)</code>, channel means <code>(3,)</code>. Right-aligned, 3 meets W: <span class="c-r">wrong</span> (error, or a silent bug if W happens to be 3). Reshape the mean to <code>(3, 1, 1)</code> (or <code>(1, 3, 1, 1)</code>) so 3 lines up with C. torchvision's <code>Normalize</code> does this for you.</p>` },
      { title: 'The (N, 1) − (N,) trap', html: `<p>A regression model outputs <code>(64, 1)</code>, targets are <code>(64,)</code>. <code>((pred - y)**2).mean()</code> gives a <code>(64, 64)</code> matrix averaged: a meaningless loss that still decreases a little, so nobody notices. Fix: <code>pred.squeeze(-1)</code> or <code>y.unsqueeze(-1)</code>, and assert shapes in your training step.</p>`, code: { lang: 'python', title: 'Plain-Python shape check', run: true, code: `def broadcast(a, b):
    out = []
    for k in range(1, max(len(a), len(b)) + 1):
        x = a[-k] if k <= len(a) else 1
        y = b[-k] if k <= len(b) else 1
        if x != y and 1 not in (x, y):
            return None
        out.append(max(x, y) if 1 in (x, y) else x)
    return tuple(reversed(out))

print(broadcast((64, 1), (64,)))   # (64, 64): the silent bug
print(broadcast((64,), (64,)))     # (64,): what you meant
print(broadcast((2, 3), (3, 2)))   # None: PyTorch would raise
` } }
    ],
    deepDive: `<p><b>🟣 Strides and views.</b> A tensor is a flat storage buffer plus a <code>shape</code>, <code>stride</code> (how many elements to skip per step along each dim) and an offset. <code>x.t()</code>, <code>permute</code>, slicing and <code>expand</code> only change strides, which is why they are free. Broadcasting is implemented by giving stretched dims a stride of 0. A tensor is <i>contiguous</i> when its strides match a row-major layout; many kernels and <code>view</code> need that.</p>
      <p><b>dtypes in practice.</b> float32 is the default for weights. Class labels for <code>CrossEntropyLoss</code> are int64. Masks are bool. Mixing dtypes follows type-promotion rules (int + float → float), but an int tensor never gets gradients. <code>torch.tensor(data)</code> copies; <code>torch.as_tensor</code> and <code>torch.from_numpy</code> may share memory, so editing the NumPy array changes the tensor.</p>
      <p><b>In-place ops</b> end in an underscore (<code>add_</code>, <code>relu_</code>, <code>zero_</code>). They save memory but can break autograd if they overwrite a value saved for backward ("one of the variables needed for gradient computation has been modified by an inplace operation").</p>
      <p><b>einsum</b> names dimensions explicitly: <code>torch.einsum('btd,bsd-&gt;bts', q, k)</code> is attention scores. When shapes get confusing, einsum is often clearer than chains of transpose and matmul.</p>`,
    aiEra: `<p><b>🤖 AI assistants and shapes.</b> Assistants write tensor code quickly but often get a dimension wrong in a way that still runs, because broadcasting hides it. Two habits catch nearly all of these: annotate shapes in comments (<code># (B, T, D)</code>) on every line the assistant writes, and add <code>assert x.shape == (B, T, D)</code> checks in the forward pass while developing. Ask the assistant to "write the shape after every line": if it cannot, the code is not ready. Libraries such as <code>einops</code> (<code>rearrange(x, 'b c h w -&gt; b (h w) c')</code>) make the intent explicit, so both you and the assistant are less likely to swap dimensions.</p>`,
    problems: [
      PR('bcast', {
        title: 'Compute the Broadcast Shape', level: 'Easy', tags: ['tensors', 'broadcasting', 'shapes'], companies: ['Meta', 'NVIDIA'],
        statement: `<p>Write <code>broadcast_shape(a, b)</code> that returns the shape PyTorch produces for an element-wise operation between tensors of shapes <code>a</code> and <code>b</code> (lists of sizes). If the shapes cannot be broadcast, return <code>[-1]</code>.</p>
          <p>Rule: align from the right; a missing dim counts as 1; two sizes are compatible if they are equal or one is 1, and the result takes the other size (so 1 vs 0 gives 0).</p>`,
        constraints: `<p>0 ≤ len(a), len(b) ≤ 8. Sizes are 0 … 10<sup>5</sup>. An empty list is a scalar (shape <code>()</code>).</p>`,
        example: `<p><code>a = [8, 1, 6, 1]</code>, <code>b = [7, 1, 5]</code> → <code class="c-g">[8, 7, 6, 5]</code>. Right to left: 1 vs 5 → 5; 6 vs 1 → 6; 1 vs 7 → 7; 8 vs missing → 8.</p>
          <p><code>a = [2, 3]</code>, <code>b = [3, 2]</code> → <code class="c-r">[-1]</code>: 3 vs 2, neither is 1.</p>`,
        bruteWhy: `<p>Padding both shapes with leading 1s to the same length, then comparing pairs, is just as correct and fine for short shapes. It only costs two extra copies. The single right-to-left loop is the same rule without the padding step.</p>`,
        mcq: { q: `What is the broadcast shape of <code>(4, 3)</code> and <code>(4,)</code>?`, options: ['Error: 3 vs 4', '(4, 3)', '(4, 4)', '(4, 3, 4)'], answer: 0, explain: `Right-align: the (4,) lines up with the last dim, 3. 3 vs 4 are different and neither is 1, so it fails. You probably meant <code>(4, 1)</code>.` },
        hints: [
          `Hint 1: Compare the LAST sizes first. Index with a[-k] for k = 1, 2, … and treat a missing one as 1.`,
          `Hint 2: For each pair: equal → keep it; one is 1 → take the other; otherwise the shapes are incompatible.`,
          `Hint 3: Build the result right to left and reverse it at the end. Two empty shapes give an empty result (a scalar). Return [-1] as soon as a pair fails.`
        ],
        approach: `<p>Walk the dimensions from the right. For each position take each size (1 if that shape is shorter), apply the rule, and append. Reverse at the end. Stop with <code>[-1]</code> on the first mismatch.</p>`,
        dry: { head: ['k', 'a[-k]', 'b[-k]', 'result dim', 'out'], rows: [['1', '1', '5', '5 (stretch a)', '[5]'], ['2', '6', '1', '6 (stretch b)', '[5, 6]'], ['3', '1', '7', '7', '[5, 6, 7]'], ['4', '8', '(1)', '8', '[5, 6, 7, 8] → reversed [8, 7, 6, 5]']] },
        complexity: `<p>O(max(len(a), len(b))) time and space.</p>`,
        followUps: ['Extend it to any number of shapes (torch.broadcast_shapes).', 'Which in-place op fails even though the out-of-place one broadcasts? (a.add_(b) cannot grow a.)']
      })
    ]
  });

  // ===================== TOPIC 2: AUTOGRAD =====================
  topics.push({
    title: 'Autograd: How PyTorch Computes Gradients for You',
    analogy: `<p>Autograd is like a <b>shop receipt that records every step</b> of a recipe. While you cook (the forward pass) each operation writes a line: "multiplied a by b", "added c". When you want to know how much each ingredient affected the final taste, you read the receipt <b>from the bottom up</b> (the backward pass), and every line tells you its own small effect. Multiply those small effects together and you have the answer for every ingredient at once.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> In ai20 you did backpropagation by hand: forward pass, save the middle values, then apply the chain rule backwards. PyTorch automates exactly that. Any tensor created with <code>requires_grad=True</code> (all <code>nn.Parameter</code>s are) is <b>tracked</b>: each operation on it records a node in a <b>computational graph</b> (visible as <code>y.grad_fn</code>). Calling <code>loss.backward()</code> walks that graph from the loss back to the leaves and <b>adds</b> each gradient into <code>.grad</code>.</p>
      <h4>Three rules that explain most autograd surprises</h4>
      <ol>
        <li><b>Gradients accumulate.</b> <code>.grad</code> is added to, never overwritten. That is why every training step calls <code>optimizer.zero_grad()</code> (in PyTorch 2.x it sets grads to <code>None</code> by default, which is slightly faster). It is also what makes gradient accumulation possible.</li>
        <li><b>The graph is built during forward and freed after backward.</b> Calling <code>backward()</code> twice on the same graph fails unless you pass <code>retain_graph=True</code>. The graph is rebuilt on every forward pass ("define-by-run"), so normal Python <code>if</code> and loops just work.</li>
        <li><b>Only scalars can call backward() without arguments.</b> The loss must be a single number (use <code>.mean()</code> or <code>.sum()</code>). For a vector output you must pass the upstream gradient.</li>
      </ol>
      <h4>Turning tracking off</h4>
      ${H.table(['tool', 'what it does', 'use it for'], [
        ['<code>with torch.no_grad():</code>', 'operations inside are not recorded', 'validation, manual weight updates'],
        ['<code>with torch.inference_mode():</code>', 'like no_grad, plus faster (tensors cannot later join autograd)', 'serving / pure inference'],
        ['<code>x.detach()</code>', 'same data, cut off from the graph', 'logging values, targets that must not get gradients'],
        ['<code>p.requires_grad_(False)</code>', 'stop computing grads for a parameter', 'freezing layers when fine-tuning']
      ])}
      <h4>A worked example</h4>
      <p>a = 2, b = 3, c = 4, L = a·b + c = 10. Backward: dL/dL = 1; the add passes 1 to both inputs, so dL/dc = 1 and d(ab) = 1; the mul sends "the other input" times the upstream gradient: dL/da = b·1 = <b>3</b>, dL/db = a·1 = <b>2</b>. That is all autograd does, just for millions of numbers at once.</p>`,
    clues: [
      '"element 0 of tensors does not require grad and does not have a grad_fn" → something was detached, created under no_grad, or the parameter was frozen',
      '"Trying to backward through the graph a second time" → backward() called twice on one graph (often a tensor reused across iterations): detach it or rebuild it',
      '"grad can be implicitly created only for scalar outputs" → the loss is a vector: reduce it with mean() or sum()',
      'Validation slowly fills GPU memory → evaluation is running without torch.no_grad(), building graphs nobody uses',
      '"Loss.item() vs loss" when logging: storing the tensor keeps the whole graph alive',
      'Interviewer: "implement micrograd" or "how does backward() work?" → topological sort + chain rule + accumulate'
    ],
    code: [
      { lang: 'python', title: 'Autograd in PyTorch 2.x (shown, not run here)', code: `import torch

a = torch.tensor(2.0, requires_grad=True)
b = torch.tensor(3.0, requires_grad=True)
c = torch.tensor(4.0, requires_grad=True)
L = a * b + c                    # forward pass records a graph
print(L.grad_fn)                 # <AddBackward0 ...>
L.backward()                     # walk the graph backwards
print(a.grad, b.grad, c.grad)    # tensor(3.) tensor(2.) tensor(1.)

# gradients ACCUMULATE: a second forward + backward adds to .grad
L2 = a * b + c
L2.backward()
print(a.grad)                    # tensor(6.)  -> this is why we call zero_grad()
a.grad = None

# no tracking for evaluation or manual updates
with torch.no_grad():
    a -= 0.1 * 3.0               # allowed: in-place update of a leaf, not recorded

# vector outputs need an explicit upstream gradient (or reduce to a scalar first)
x = torch.randn(5, requires_grad=True)
y = x ** 2
y.sum().backward()               # same as y.backward(torch.ones_like(y))
print(torch.allclose(x.grad, 2 * x.detach()))   # True
` },
      { lang: 'python', title: 'A micrograd-style engine in plain Python (runs here)', run: true, code: `class Value:
    def __init__(self, data, parents=()):
        self.data, self.grad, self.parents = data, 0.0, parents   # parents: (node, local slope)
    def __add__(self, o):
        return Value(self.data + o.data, ((self, 1.0), (o, 1.0)))
    def __mul__(self, o):
        return Value(self.data * o.data, ((self, o.data), (o, self.data)))
    def backward(self):
        order, seen = [], set()
        def visit(v):
            if id(v) not in seen:
                seen.add(id(v))
                for p, _ in v.parents:
                    visit(p)
                order.append(v)
        visit(self)
        self.grad = 1.0
        for v in reversed(order):            # outputs before inputs
            for p, local in v.parents:
                p.grad += v.grad * local       # chain rule, accumulated

a, b, c = Value(2.0), Value(3.0), Value(4.0)
L = a * b + c
L.backward()
print(L.data, a.grad, b.grad, c.grad)        # 10.0 3.0 2.0 1.0
x = Value(3.0)
y = x * x                                    # x used twice: both paths add up
y.backward()
print(x.grad)                                # 6.0
` }
    ],
    codeTitle: ['PyTorch autograd', 'Plain-Python engine'],
    viz: {
      title: 'Forward then backward through L = (a·b + c)·a',
      input: '2 -3 10',
      inputLabel: 'a b c',
      gen: function (input) {
        var v = nums(input, 'a b c', 3);
        if (v.length !== 3) throw new Error('Enter exactly three numbers: a b c');
        if (v.some(function (x) { return Math.abs(x) > 100; })) throw new Error('Keep values between -100 and 100');
        var a = v[0], b = v[1], c = v[2], d = a * b, e = d + c, L = e * a, F = [];
        var nodes = [{ id: 'a', label: 'a=' + a, x: 8, y: 10 }, { id: 'b', label: 'b=' + b, x: 8, y: 30 }, { id: 'c', label: 'c=' + c, x: 8, y: 50 },
          { id: 'd', label: 'd=a·b', x: 38, y: 20, shape: 'box' }, { id: 'e', label: 'e=d+c', x: 64, y: 35, shape: 'box' }, { id: 'L', label: 'L=e·a', x: 90, y: 20, shape: 'box' }];
        var edges = [['a', 'd'], ['b', 'd'], ['d', 'e'], ['c', 'e'], ['e', 'L'], ['a', 'L']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'computational graph (recorded during forward)', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags }; }
        F.push({ narr: 'Forward: <b>d = a·b = ' + d + '</b>. PyTorch computes the value and records a MulBackward node that remembers a and b (it will need them for the slope).', parts: [g({ d: 'cur' }, { 'a-d': 'cur', 'b-d': 'cur' }, { d: String(d) })] });
        F.push({ narr: 'Forward: <b>e = d + c = ' + e + '</b>. An AddBackward node: its local slopes are just 1 and 1.', parts: [g({ e: 'cur' }, { 'd-e': 'cur', 'c-e': 'cur' }, { d: String(d), e: String(e) })] });
        F.push({ narr: 'Forward: <b>L = e·a = ' + L + '</b>. Note that <b>a is used twice</b> (in d and in L). The graph is complete; nothing about gradients has happened yet.', parts: [g({ L: 'sel' }, { 'e-L': 'cur', 'a-L': 'cur' }, { d: String(d), e: String(e), L: String(L) })] });
        var gL = 1, ge = a, gaDirect = e, gd = ge, gc = ge, ga1 = gd * b, gb = gd * a, ga = gaDirect + ga1;
        F.push({ narr: 'Backward starts: <code>L.backward()</code> seeds dL/dL = 1. The mul node L = e·a sends to each input "the other input × upstream": dL/de = a = <b>' + ge + '</b>, and a gets its first share dL/da += e = <b>' + gaDirect + '</b>.', parts: [g({ L: 'cur', e: 'ok', a: 'ok' }, { 'e-L': 'ok', 'a-L': 'ok' }, { L: 'g=1', e: 'g=' + ge, a: 'g=' + gaDirect }), { type: 'vars', label: '.grad so far', vals: { 'a.grad': gaDirect, 'b.grad': 0, 'c.grad': 0 }, hl: { 'a.grad': 'cur' } }] });
        F.push({ narr: 'The add node passes its gradient unchanged to both inputs: dL/dd = dL/dc = <b>' + gd + '</b>.', parts: [g({ e: 'cur', d: 'ok', c: 'ok' }, { 'd-e': 'ok', 'c-e': 'ok' }, { e: 'g=' + ge, d: 'g=' + gd, c: 'g=' + gc }), { type: 'vars', label: '.grad so far', vals: { 'a.grad': gaDirect, 'b.grad': 0, 'c.grad': gc }, hl: { 'c.grad': 'ok' } }] });
        F.push({ narr: 'The mul node d = a·b: dL/db = a × ' + gd + ' = <b>' + gb + '</b>, and a gets a <b>second</b> share b × ' + gd + ' = ' + ga1 + '. Gradients from both paths are <b>added</b>: a.grad = ' + gaDirect + ' + ' + ga1 + ' = <b>' + ga + '</b>.', parts: [g({ d: 'cur', a: 'sel', b: 'ok' }, { 'a-d': 'ok', 'b-d': 'ok' }, { d: 'g=' + gd, a: 'g=' + ga, b: 'g=' + gb }), { type: 'vars', label: 'final .grad', vals: { 'a.grad': ga, 'b.grad': gb, 'c.grad': gc }, hl: { 'a.grad': 'sel', 'b.grad': 'ok' } }] });
        F.push({ narr: 'Check by hand: L = (ab + c)a = a²b + ac, so dL/da = 2ab + c = ' + (2 * a * b + c) + ', dL/db = a² = ' + a * a + ', dL/dc = a = ' + a + '. Autograd agrees. If you ran forward + backward again without <code>zero_grad()</code>, every .grad would double.', parts: [{ type: 'table', label: 'autograd vs calculus', columns: ['input', 'autograd', 'formula'], rows: [['a', ga, 2 * a * b + c], ['b', gb, a * a], ['c', gc, a]] }] });
        return F;
      }
    },
    examples: [
      { title: 'Why zero_grad() is in every loop', html: `<p>Step 1 computes a.grad = 3. Without zeroing, step 2 adds another 3 → 6, so the optimiser moves twice as far, then three times… The loss oscillates or explodes. The <b>order</b> of <code>zero_grad → forward → backward → step</code> matters less than doing zero_grad once per update.</p>` },
      { title: 'Logging the loss correctly', html: `<p><code>history.append(loss)</code> keeps every step's graph alive (memory grows each step). <code>history.append(loss.item())</code> stores a Python float. Use <code>.item()</code> (or <code>.detach()</code>) for anything you keep.</p>` },
      { title: 'A reused node accumulates', html: `<p>y = x·x at x = 3. The graph has two edges from x into the mul. Backward sends 3 along each, and they add up to <b>6</b> = 2x. This is why engines use <code>+=</code> for <code>.grad</code>: it is not just for multiple steps, it is how shared nodes work.</p>` }
    ],
    deepDive: `<p><b>🟣 Reverse mode.</b> Autograd is reverse-mode automatic differentiation: one backward pass gives the gradient of one scalar with respect to <i>all</i> inputs, costing about 2–3× a forward pass. That is ideal for ML (one loss, millions of parameters). Forward mode (<code>torch.func.jvp</code>) is the opposite trade-off.</p>
      <p><b>Saved tensors and memory.</b> Each node stores what its backward needs (a mul saves both inputs, a ReLU its output mask). Activations saved for backward usually dominate training memory, which is why <b>activation checkpointing</b> (<code>torch.utils.checkpoint</code>) re-computes them during backward to trade compute for memory.</p>
      <p><b>Leaves vs non-leaves.</b> Only leaf tensors (created by you, with requires_grad) get <code>.grad</code> populated; intermediate tensors do not unless you call <code>.retain_grad()</code>. Hooks (<code>tensor.register_hook</code>, module hooks) let you inspect or modify gradients in flight.</p>
      <p><b>Custom functions and checks.</b> Subclass <code>torch.autograd.Function</code> with <code>forward</code>/<code>backward</code> static methods for custom kernels; verify them with <code>torch.autograd.gradcheck</code> in float64. <code>torch.autograd.set_detect_anomaly(True)</code> reports which forward op produced a NaN gradient (slow; debugging only). In PyTorch 2.x, <code>torch.compile</code> captures the graph ahead of time (TorchDynamo + AOTAutograd) but keeps the same semantics.</p>`,
    aiEra: `<p><b>🤖 Autograd and assistants.</b> Because autograd is automatic, generated code rarely gets the maths wrong; it gets the <i>graph</i> wrong: a stray <code>.detach()</code> or <code>.item()</code> in the middle of a loss, a <code>.numpy()</code> round-trip, a tensor built with <code>torch.tensor(list_of_tensors)</code> (which copies values and drops the graph), or a missing <code>no_grad</code> in evaluation. A quick review test: after <code>loss.backward()</code>, assert that every parameter you expect to train has a non-None, non-zero <code>.grad</code>. Asking an assistant to "write micrograd" is also one of the best ways to check your own understanding: then read its backward functions line by line.</p>`,
    problems: [
      PR('engine', {
        title: 'Build a Tiny Scalar Autograd Engine', level: 'Medium', tags: ['autograd', 'backpropagation', 'computational graph'], companies: ['OpenAI', 'Tesla', 'Meta'],
        statement: `<p>You get input values <code>vals</code> (nodes 0 … len(vals)−1) and a list of operations. Each operation creates the next node:</p>
          <ul><li><code>"add i j"</code> → node_i + node_j</li><li><code>"mul i j"</code> → node_i × node_j</li><li><code>"relu i"</code> → max(0, node_i) (slope 0 at exactly 0, as in PyTorch)</li><li><code>"tanh i"</code> → tanh(node_i)</li></ul>
          <p>The last node is the loss L. Write <code>backprop_graph(vals, ops)</code> that returns dL/d(input) for every input node, like <code>L.backward()</code> followed by reading each leaf's <code>.grad</code>. A node may be used more than once.</p>`,
        constraints: `<p>1 ≤ len(vals) ≤ 20, 1 ≤ len(ops) ≤ 200; ops only refer to earlier nodes. Answers compared with a 1e-5 tolerance.</p>`,
        example: `<p><code>vals = [2, 3, 4]</code>, <code>ops = ["mul 0 1", "add 3 2"]</code>: node 3 = 6, node 4 = L = 10 → <code class="c-g">[3, 2, 1]</code> (dL/da = b, dL/db = a, dL/dc = 1).</p>
          <p><code>vals = [2]</code>, <code>ops = ["mul 0 0"]</code> → <code class="c-g">[4]</code>: x·x has slope 2x, and both uses add up.</p>`,
        bruteWhy: `<p>Numeric differentiation re-runs the whole graph twice per input (central difference). With P inputs that is 2P forward passes, and the result is only approximate, which is hopeless for a model with 10<sup>9</sup> weights. Reverse mode gets all gradients from one backward pass.</p>`,
        mcq: { q: `In <code>y = x * x</code>, what must the engine do when sending gradients back to x?`, options: ['Add the contributions from both uses of x', 'Keep only the last contribution', 'Average the two contributions', 'Raise an error: a node cannot be used twice'], answer: 0, explain: `Each use is a separate path in the graph, and the multivariable chain rule sums over paths: 3 + 3 = 6 = 2x.` },
        hints: [
          `Hint 1: Store, for every node, its value and a list of (parent, local slope) pairs. Local slopes: add → 1 and 1; mul → the other input's value; relu → 1 if input > 0 else 0; tanh → 1 − t².`,
          `Hint 2: Backward must visit a node only after every node that uses it. Since ops only refer to earlier nodes, walking indices from last to first is already a valid order (or do a DFS topological sort, like micrograd).`,
          `Hint 3: Set grad[last] = 1, then for each node from the end: for each (parent, local): grad[parent] += grad[node] * local. Use += so reused nodes collect every path. Return the first len(vals) grads.`
        ],
        approach: `<p>Forward: build nodes in order, storing each node's value and its parents with the local derivative computed from the forward values. Backward: seed the loss with gradient 1 and process nodes in reverse topological order, adding <code>upstream × local</code> into each parent. This is exactly what <code>loss.backward()</code> does, and the <code>+=</code> is the same reason <code>.grad</code> accumulates in PyTorch.</p>`,
        dry: { head: ['node', 'op', 'value', 'grad (after backward)'], rows: [['0 (a)', 'input', '2', '3'], ['1 (b)', 'input', '3', '2'], ['2 (c)', 'input', '4', '1'], ['3', 'mul 0 1', '6', '1'], ['4 = L', 'add 3 2', '10', '1 (seed)']] },
        complexity: `<p>O(V + E) for the forward and the backward pass, where V is the number of nodes and E ≤ 2V edges. O(V) memory for the saved values: the same "store activations for backward" cost that real training pays.</p>`,
        followUps: ['Add "exp" and "pow k" ops. What does each need to save from the forward pass?', 'How would you support a vector-valued node (like a tensor) instead of scalars?']
      })
    ]
  });

  // ===================== TOPIC 3: nn.Module, Dataset, DataLoader =====================
  topics.push({
    title: 'nn.Module, Dataset and DataLoader',
    analogy: `<p>Think of a restaurant. The <b>Dataset</b> is the pantry: ask it for item number 17 and it hands you one prepared ingredient. The <b>DataLoader</b> is the kitchen porter: it decides the order (shuffled each night), puts ingredients on trays of 32 (batches), and several porters (workers) can fetch in parallel so the chef never waits. The <b>nn.Module</b> is the chef's station: it owns its knives (parameters) and knows one recipe, <code>forward</code>, which turns a tray of ingredients into dishes.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Every PyTorch project has the same three building blocks. Learn their contracts and any codebase becomes readable.</p>
      <h4>1. <code>nn.Module</code>: a model with its parameters</h4>
      <p>Subclass it, create layers in <code>__init__</code>, and describe the computation in <code>forward</code>. Assigning a layer to <code>self.something</code> <b>registers</b> it, so <code>model.parameters()</code>, <code>model.to(device)</code>, <code>model.train()</code> and <code>state_dict()</code> find it automatically. Call the model as <code>model(x)</code>, never <code>model.forward(x)</code>, so hooks run.</p>
      ${H.table(['building block', 'what it holds', 'typical use'], [
        ['<code>nn.Linear(in, out)</code>', 'weight (out × in) + bias (out)', 'MLPs, classifier heads'],
        ['<code>nn.Conv2d</code>, <code>nn.Embedding</code>', 'kernels / a lookup table', 'images / tokens'],
        ['<code>nn.Sequential(...)</code>', 'a list of modules run in order', 'simple stacks'],
        ['<code>nn.ModuleList</code> / <code>ModuleDict</code>', 'registered lists/dicts of modules', 'a variable number of blocks'],
        ['<code>nn.Parameter(t)</code>', 'a tensor that should be trained', 'custom weights'],
        ['<code>self.register_buffer(...)</code>', 'state that is saved but not trained', 'BatchNorm running stats, masks']
      ])}
      <p>A plain Python list of layers is <span class="c-r">not</span> registered: its weights are never trained or moved to the GPU. Use <code>nn.ModuleList</code>.</p>
      <h4>2. <code>Dataset</code>: one example at a time</h4>
      <p>A map-style dataset implements <code>__len__</code> and <code>__getitem__(i)</code> returning one example, e.g. <code>(image_tensor, label)</code>. Do loading, decoding and per-example transforms here. (<code>IterableDataset</code> is for streams where you cannot index.)</p>
      <h4>3. <code>DataLoader</code>: batches, order and parallelism</h4>
      <p>It combines a <b>sampler</b> (which indices, in what order: sequential, or shuffled once per epoch), <b>batching</b> (<code>batch_size</code>, <code>drop_last</code>), a <b>collate function</b> that stacks examples into batch tensors (custom for variable-length text, where you pad), and <b>workers</b> (<code>num_workers</code> processes loading in parallel, <code>pin_memory=True</code> for faster copies to the GPU).</p>
      ${H.table(['setting', 'train loader', 'validation loader'], [['shuffle', '<span class="c-g">True</span>: new order each epoch', 'False: order does not matter'], ['drop_last', 'often True (avoids a tiny last batch, e.g. for BatchNorm)', 'False: evaluate every example'], ['batch_size', 'limited by GPU memory', 'can be larger (no gradients stored)']])}`,
    clues: [
      '"model has 0 parameters" or weights not moving to the GPU → layers kept in a plain list or dict instead of nn.ModuleList / nn.ModuleDict',
      '"stack expects each tensor to be equal size" → variable-length examples: write a collate_fn that pads',
      'GPU utilisation low, CPU busy → data loading is the bottleneck: num_workers, pin_memory, persistent_workers, pre-processing',
      '"Training accuracy depends on file order" or validation looks better than test → forgot shuffle=True on the train loader (or shuffled before splitting incorrectly)',
      '"same random augmentation in every worker" → seed workers with worker_init_fn / generator',
      'Interviewer: "walk me through writing a custom Dataset" → __len__, __getitem__, transforms, collate'
    ],
    code: { lang: 'python', title: 'Model, Dataset and DataLoader in PyTorch 2.x (shown, not run here)', code: `import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader

class MLP(nn.Module):
    def __init__(self, d_in, d_hidden, n_classes, p_drop=0.1):
        super().__init__()                          # always call this first
        self.net = nn.Sequential(
            nn.Linear(d_in, d_hidden), nn.ReLU(), nn.Dropout(p_drop),
            nn.Linear(d_hidden, n_classes),         # outputs logits, no softmax here
        )
    def forward(self, x):                           # x: (B, d_in)
        return self.net(x)                          # (B, n_classes)

class TabularDataset(Dataset):
    def __init__(self, features, labels):
        self.x = torch.as_tensor(features, dtype=torch.float32)
        self.y = torch.as_tensor(labels, dtype=torch.long)
    def __len__(self):
        return len(self.y)
    def __getitem__(self, i):
        return self.x[i], self.y[i]                 # ONE example

def pad_collate(batch):                             # for variable-length token lists
    seqs, labels = zip(*batch)
    padded = nn.utils.rnn.pad_sequence(seqs, batch_first=True, padding_value=0)
    return padded, torch.stack(labels)

g = torch.Generator().manual_seed(0)                # reproducible shuffling
train_ds = TabularDataset(torch.randn(1000, 20), torch.randint(0, 3, (1000,)))
train_dl = DataLoader(train_ds, batch_size=64, shuffle=True, drop_last=True,
                      num_workers=4, pin_memory=True, persistent_workers=True, generator=g)

model = MLP(20, 128, 3)
print(sum(p.numel() for p in model.parameters()))   # 20*128+128 + 128*3+3 = 3075
xb, yb = next(iter(train_dl))                        # xb: (64, 20), yb: (64,)
` },
    viz: {
      title: 'A DataLoader shuffling and batching indices',
      input: '10 4 42',
      inputLabel: 'n examples, batch size, seed  (n ≤ 16)',
      gen: function (input) {
        var v = nums(input, 'n batch_size seed', 3);
        if (v.length !== 3) throw new Error('Enter three numbers: n batch_size seed');
        var n = v[0], bs = v[1], seed = v[2];
        if (n < 1 || n > 16 || bs < 1 || bs > 16 || Math.floor(n) !== n || Math.floor(bs) !== bs || seed < 0 || Math.floor(seed) !== seed) throw new Error('Use whole numbers: 1 ≤ n ≤ 16, 1 ≤ batch size ≤ 16, seed ≥ 0');
        var idx = [], F = [], s = BigInt(seed);
        for (var i = 0; i < n; i++) idx.push(i);
        F.push({ narr: 'The Dataset has ' + n + ' examples, numbered 0…' + (n - 1) + '. The sampler starts from this order and shuffles it with a <b>seeded</b> generator, so the same seed gives the same order every run.', parts: [{ type: 'array', label: 'indices', values: idx.slice(), showIdx: true }] });
        var shown = 0;
        for (var k = n - 1; k >= 1; k--) {
          s = (s * 1103515245n + 12345n) % 2147483648n;
          var j = Number(s % BigInt(k + 1)), t = idx[k]; idx[k] = idx[j]; idx[j] = t;
          if (shown < 5 || k === 1) { var h = {}; h[k] = 'ok'; h[j] = 'cur'; F.push({ narr: 'Fisher–Yates step: pick j = ' + j + ' from 0…' + k + ' and swap positions ' + j + ' and ' + k + '. Position ' + k + ' is now final.', parts: [{ type: 'array', label: 'indices', values: idx.slice(), hl: h, showIdx: true }] }); }
          shown++;
        }
        var nb = Math.ceil(n / bs);
        for (var b = 0; b < nb; b++) {
          var lo = b * bs, hi = Math.min(n, lo + bs), h2 = {};
          for (var q = lo; q < hi; q++) h2[q] = 'win';
          var short = hi - lo < bs;
          F.push({ narr: 'Batch ' + b + ': indices [' + idx.slice(lo, hi).join(', ') + ']. The collate function fetches dataset[i] for each and stacks them into one tensor of shape (' + (hi - lo) + ', …).' + (short ? ' This last batch is <b>short</b>: with <code>drop_last=True</code> it would be skipped.' : ''), parts: [{ type: 'array', label: 'shuffled indices', values: idx.slice(), hl: h2, range: [lo, hi - 1] }, { type: 'array', label: 'batch ' + b, values: idx.slice(lo, hi), hl: short ? { 0: 'bad' } : {} }] });
        }
        F.push({ narr: 'Next epoch the sampler shuffles again, continuing the <b>same</b> generator, so epoch 2 has a different but still reproducible order. Every example is seen exactly once per epoch.', parts: [{ type: 'text', label: 'summary', html: n + ' examples, batch size ' + bs + ' → ' + nb + ' batches per epoch (' + Math.floor(n / bs) + ' with drop_last=True)' }] });
        return F;
      }
    },
    examples: [
      { title: 'Counting parameters of a module', html: `<p><code>nn.Linear(20, 128)</code> has 20·128 weights + 128 biases = 2,688. <code>nn.Linear(128, 3)</code> has 384 + 3 = 387. ReLU and Dropout have none. Total <b>3,075</b>, which is what <code>sum(p.numel() for p in model.parameters())</code> prints. Add <code>if p.requires_grad</code> to count only trainable ones (important after freezing layers).</p>` },
      { title: 'Variable-length text needs a collate_fn', html: `<p>Examples of 7, 12 and 4 tokens cannot be stacked. A collate function pads them to 12 with the pad id and also returns an attention mask (1 for real tokens, 0 for padding) so the loss and attention ignore the padding. Hugging Face's <code>DataCollatorWithPadding</code> does this per batch ("dynamic padding"), which is faster than padding everything to the longest example in the dataset.</p>` },
      { title: 'Where should augmentation happen?', html: `<p>In <code>__getitem__</code> (or the transform it calls), so each epoch sees a fresh random crop or flip of every image, computed in parallel by the workers. Validation data gets only deterministic transforms (resize, normalise).</p>` }
    ],
    deepDive: `<p><b>🟣 Module internals.</b> <code>nn.Module.__setattr__</code> intercepts assignments and files Parameters, sub-Modules and buffers into internal dicts; that is how <code>parameters()</code>, <code>named_modules()</code>, <code>state_dict()</code> and <code>.to()</code> work recursively. Buffers registered with <code>persistent=False</code> are not saved. <code>model.apply(fn)</code> visits every sub-module (handy for custom initialisation).</p>
      <p><b>Workers.</b> With <code>num_workers &gt; 0</code> each worker is a separate process holding a copy of the Dataset; keep the Dataset light (file paths, not decoded images) to avoid copying gigabytes. On Linux, Python lists of objects in the Dataset can slowly grow worker memory through reference-count copy-on-write; NumPy arrays or tensors avoid that. <code>persistent_workers=True</code> keeps workers alive between epochs, and <code>prefetch_factor</code> sets how many batches each worker prepares ahead.</p>
      <p><b>Samplers.</b> <code>WeightedRandomSampler</code> oversamples rare classes; <code>DistributedSampler</code> gives each GPU a disjoint shard (call <code>sampler.set_epoch(epoch)</code> each epoch or every epoch has the same order). For huge datasets that do not fit on disk, streaming formats (WebDataset, Hugging Face <code>datasets</code> streaming, Mosaic StreamingDataset) feed an <code>IterableDataset</code>.</p>`,
    aiEra: `<p><b>🤖 Assistants and data pipelines.</b> Generated Dataset classes are usually fine; the subtle bugs are in the loaders: shuffling the validation set while computing metrics that depend on order, forgetting <code>DistributedSampler.set_epoch</code>, doing tokenisation inside the training loop instead of once with <code>datasets.map(batched=True)</code>, or leaking test examples into training through a random split done after augmentation. Ask the assistant to print one batch's shapes, dtypes and a decoded example before any training runs. Hugging Face <code>datasets</code> plus a collator now replaces most hand-written Dataset code for text, but you still need to know the contract to debug it.</p>`,
    problems: [
      PR('batches', {
        title: 'Batch Indices Like a Seeded DataLoader', level: 'Medium', tags: ['DataLoader', 'shuffling', 'reproducibility'], companies: ['Meta', 'Google'],
        statement: `<p>Write <code>make_batches(n, batch_size, shuffle, drop_last, seed)</code> that returns the list of index batches a DataLoader would produce for one epoch over a dataset of size <code>n</code>.</p>
          <ul><li>If <code>shuffle</code> is false the order is 0, 1, …, n − 1.</li>
          <li>If true, shuffle with this exact seeded Fisher–Yates: <code>state = seed</code>; for <code>i</code> from n − 1 down to 1: <code>state = (state * 1103515245 + 12345) % 2147483648</code>, <code>j = state % (i + 1)</code>, swap positions i and j.</li>
          <li>Cut the order into consecutive chunks of <code>batch_size</code>. If the last chunk is shorter and <code>drop_last</code> is true, drop it.</li></ul>`,
        constraints: `<p>0 ≤ n ≤ 10<sup>5</sup>, 1 ≤ batch_size ≤ 10<sup>5</sup>, 0 ≤ seed &lt; 2<sup>31</sup>. Python integers do not overflow, so the formula is exact.</p>`,
        example: `<p><code>n = 5, batch_size = 2, shuffle = False, drop_last = False</code> → <code class="c-g">[[0, 1], [2, 3], [4]]</code>; with <code>drop_last = True</code> → <code class="c-y">[[0, 1], [2, 3]]</code>.</p>
          <p><code>n = 5, batch_size = 2, shuffle = True, seed = 42</code> → <code class="c-g">[[1, 3], [4, 0], [2]]</code>.</p>`,
        bruteWhy: `<p>A tempting shortcut is to call <code>random.shuffle</code> with no seed. It works, but two runs give different batches, so you cannot reproduce a bug or compare two experiments fairly. Another wrong approach is to sample a random index for every slot (with replacement), which repeats some examples and skips others within an epoch.</p>`,
        mcq: { q: `With 1,000 examples, batch_size 64 and drop_last=True, how many batches per epoch?`, options: ['15', '16', '15.625', '17'], answer: 0, explain: `1000 // 64 = 15 full batches; the last 40 examples are dropped this epoch (a different 40 each epoch when shuffling).` },
        hints: [
          `Hint 1: Separate the two jobs, like PyTorch does: first produce an ORDER of indices (the sampler), then cut it into chunks (the batch sampler).`,
          `Hint 2: Fisher–Yates walks i from n − 1 down to 1 and swaps position i with a random j in 0…i. Update the state BEFORE computing j.`,
          `Hint 3: Slice idx[start:start + batch_size] for start in range(0, n, batch_size); break when a slice is short and drop_last is true. n = 0 gives an empty list.`
        ],
        approach: `<p>Build the index list, shuffle it in place with the given linear congruential generator and Fisher–Yates, then slice it into batches of <code>batch_size</code>, dropping a short final slice when asked. This mirrors <code>RandomSampler</code> + <code>BatchSampler</code>; the explicit generator plays the role of <code>DataLoader(generator=torch.Generator().manual_seed(seed))</code>.</p>`,
        dry: { head: ['i', 'j = state % (i+1)', 'swap', 'order'], rows: [['start (seed 42)', '', '', '[0, 1, 2, 3, 4]'], ['4', '2', '4 ↔ 2', '[0, 1, 4, 3, 2]'], ['3', '0', '3 ↔ 0', '[3, 1, 4, 0, 2]'], ['2', '2', 'none', '[3, 1, 4, 0, 2]'], ['1', '0', '1 ↔ 0', '[1, 3, 4, 0, 2] → batches [1, 3], [4, 0], [2]']] },
        complexity: `<p>O(n) time and O(n) space for the order and the batches.</p>`,
        followUps: ['How would you continue the generator across epochs so each epoch differs but the run is reproducible?', 'How does DistributedSampler split these indices across 4 GPUs?']
      })
    ]
  });

  // ===================== TOPIC 4: TRAINING LOOP =====================
  topics.push({
    title: 'The Training Loop: Losses, Optimizers, train() and eval()',
    analogy: `<p>Training is like a <b>darts coach</b> with a player. Each round: the player throws a handful of darts (forward pass on a batch), the coach measures how far they landed from the bullseye (the loss), works out which way each muscle should adjust (backward), and the player makes a small correction (optimizer step). Then the coach wipes the whiteboard clean (zero_grad) before the next round. Every so often there is a <b>test match</b> with no coaching (eval mode) to see real progress.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> PyTorch has no <code>model.fit()</code>. You write the loop yourself, and it is always the same five lines. In ai20 you did each piece by hand; here is how they map:</p>
      ${H.table(['step', 'PyTorch line', 'what you did by hand in ai20'], [
        ['1. clear old gradients', '<code>optimizer.zero_grad()</code>', 'reset dw = db = 0'],
        ['2. forward', '<code>logits = model(xb)</code>', 'z = w·x + b, activations'],
        ['3. loss', '<code>loss = loss_fn(logits, yb)</code>', 'MSE / cross-entropy'],
        ['4. backward', '<code>loss.backward()</code>', 'chain rule, every partial derivative'],
        ['5. update', '<code>optimizer.step()</code>', 'w −= lr · dw']
      ])}
      <h4>Picking the loss</h4>
      ${H.table(['task', 'model output', 'loss', 'target'], [
        ['multi-class classification', 'logits (N, C), no softmax', '<code>nn.CrossEntropyLoss</code>', 'class ids, int64 (N,)'],
        ['binary / multi-label', 'logits (N,) or (N, K), no sigmoid', '<code>nn.BCEWithLogitsLoss</code>', 'floats 0/1'],
        ['regression', 'values', '<code>nn.MSELoss</code> / <code>nn.L1Loss</code> / <code>nn.HuberLoss</code>', 'floats, same shape'],
        ['language modelling', 'logits (B, T, V)', 'CrossEntropy on (B·T, V)', 'next tokens; padding = −100']
      ])}
      <p>CrossEntropyLoss applies log-softmax internally; adding your own softmax first is a classic bug that trains slowly. It also supports <code>ignore_index</code> (default −100, used for padding and prompt tokens) and <code>label_smoothing</code>.</p>
      <h4>Picking the optimizer</h4>
      <p><b>AdamW</b> (lr ≈ 1e-3 from scratch, 1e-5 to 5e-5 for fine-tuning transformers, weight_decay ≈ 0.01–0.1) is the default today. <b>SGD with momentum 0.9</b> (lr ≈ 0.1 with a schedule) is still common for CNNs on images and sometimes generalises better. You pass it <code>model.parameters()</code> or parameter groups with different settings.</p>
      <h4>train() vs eval()</h4>
      <p><code>model.train()</code> and <code>model.eval()</code> flip a flag on every sub-module. Only some layers care: <b>Dropout</b> drops units in train mode and does nothing in eval; <b>BatchNorm</b> uses the batch's statistics and updates running averages in train mode, and uses the stored running averages in eval. <code>eval()</code> does <b>not</b> turn off gradients; wrap evaluation in <code>torch.no_grad()</code> (or <code>inference_mode()</code>) as well.</p>`,
    clues: [
      '"Validation accuracy changes every time I evaluate the same model" → forgot model.eval() (dropout still active)',
      '"Accuracy collapses at batch size 1 in production" → BatchNorm still in train mode at inference',
      '"Loss stays at ln(C)" (2.30 for 10 classes) → the model predicts uniform probabilities: not learning (bug, lr, labels)',
      'Model has softmax in forward and uses CrossEntropyLoss → double softmax, weak gradients',
      '"Which optimizer and learning rate?" → AdamW as the default, SGD+momentum for vision baselines, tune lr first',
      'Interviewer: "write a training loop from memory" → zero_grad, forward, loss, backward, step; eval with no_grad'
    ],
    code: { lang: 'python', title: 'A complete training loop in PyTorch 2.x (shown, not run here)', code: `import torch
from torch import nn

device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = MLP(20, 128, 3).to(device)                       # from the previous topic
loss_fn = nn.CrossEntropyLoss(label_smoothing=0.1)
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)

def train_one_epoch(loader):
    model.train()                                        # dropout ON, BatchNorm uses batch stats
    total, n = 0.0, 0
    for xb, yb in loader:
        xb, yb = xb.to(device, non_blocking=True), yb.to(device, non_blocking=True)
        optimizer.zero_grad(set_to_none=True)            # 1. clear old grads
        logits = model(xb)                               # 2. forward: (B, C)
        loss = loss_fn(logits, yb)                       # 3. scalar loss
        loss.backward()                                  # 4. grads into p.grad
        optimizer.step()                                 # 5. update weights
        total += loss.item() * len(yb); n += len(yb)     # .item(): a float, no graph kept
    return total / n

@torch.no_grad()                                         # no graph, less memory
def evaluate(loader):
    model.eval()                                         # dropout OFF, BatchNorm uses running stats
    correct, total_loss, n = 0, 0.0, 0
    for xb, yb in loader:
        xb, yb = xb.to(device), yb.to(device)
        logits = model(xb)
        total_loss += loss_fn(logits, yb).item() * len(yb)
        correct += (logits.argmax(dim=1) == yb).sum().item()
        n += len(yb)
    return total_loss / n, correct / n

for epoch in range(10):
    tr = train_one_epoch(train_dl)
    va_loss, va_acc = evaluate(val_dl)
    print(f"epoch {epoch}: train {tr:.3f}  val {va_loss:.3f}  acc {va_acc:.3f}")
` },
    viz: {
      title: 'The five-line loop on a one-weight model',
      input: '0.1',
      inputLabel: 'learning rate (fit y = 2x from x = 1, 2, 3)',
      gen: function (input) {
        var lr = Number(String(input).trim());
        if (!isFinite(lr) || lr <= 0 || lr > 1) throw new Error('Enter a learning rate between 0 and 1, e.g. 0.1');
        var xs = [1, 2, 3], ys = [2, 4, 6], w = 0, F = [];
        var code = 'for xb, yb in loader:\n    optimizer.zero_grad()\n    pred = model(xb)          # w * x\n    loss = mse(pred, yb)\n    loss.backward()           # w.grad\n    optimizer.step()          # w -= lr * w.grad';
        for (var step = 0; step < 4; step++) {
          var pred = xs.map(function (x) { return w * x; });
          var loss = pred.reduce(function (s, p, i) { return s + (p - ys[i]) * (p - ys[i]); }, 0) / 3;
          var grad = pred.reduce(function (s, p, i) { return s + 2 * (p - ys[i]) * xs[i]; }, 0) / 3;
          F.push({ narr: 'Step ' + step + ' — zero_grad clears w.grad, then the forward pass predicts ' + pred.map(r4).join(', ') + ' for targets 2, 4, 6.', parts: [{ type: 'code', label: 'training loop', lang: 'python', code: code, hl: { 2: 'cur', 3: 'cur' } }, { type: 'vars', vals: { w: r4(w), 'w.grad': 0 }, hl: { w: 'cur' } }] });
          F.push({ narr: 'Loss (MSE) = ' + r4(loss) + '. <code>backward()</code> fills w.grad = mean of 2·(pred − y)·x = <b>' + r4(grad) + '</b>. ' + (grad < 0 ? 'Negative: increasing w lowers the loss.' : 'Positive: decreasing w lowers the loss.'), parts: [{ type: 'code', label: 'training loop', lang: 'python', code: code, hl: { 4: 'cur', 5: 'cur' } }, { type: 'vars', vals: { w: r4(w), loss: r4(loss), 'w.grad': r4(grad) }, hl: { 'w.grad': 'ok' } }] });
          var nw = w - lr * grad;
          F.push({ narr: '<code>optimizer.step()</code>: w = ' + r4(w) + ' − ' + lr + ' × ' + r4(grad) + ' = <b>' + r4(nw) + '</b>. ' + (Math.abs(nw - 2) < Math.abs(w - 2) ? 'Closer to the true weight 2.' : '<span class="c-r">Further from 2: this learning rate is too big and training diverges.</span>'), parts: [{ type: 'code', label: 'training loop', lang: 'python', code: code, hl: { 6: 'ok' } }, { type: 'vars', vals: { 'old w': r4(w), 'new w': r4(nw), target: 2 }, hl: { 'new w': Math.abs(nw - 2) < Math.abs(w - 2) ? 'ok' : 'bad' } }] });
          w = nw;
        }
        return F;
      }
    },
    examples: [
      { title: 'The starting loss is a free sanity check', html: `<p>With 10 balanced classes and a fresh model, softmax outputs are close to uniform, so the first cross-entropy should be about <b>ln 10 ≈ 2.30</b>. If it starts at 15, the final layer's initial outputs are huge (bad init or unscaled inputs). If it is 0.01 at step 0, labels are leaking into the inputs.</p>` },
      { title: 'One SGD-with-momentum step', html: `<p>p = 1, grad = 0.5, momentum 0.9, lr 0.1, fresh buffer: buf = 0.5, p = 1 − 0.05 = <b>0.95</b>. Next step with the same gradient: buf = 0.9·0.5 + 0.5 = 0.95, p = 0.95 − 0.095 = 0.855. Momentum makes consistent directions speed up.</p>` },
      { title: 'Eval mode without no_grad', html: `<p><code>model.eval()</code> alone still builds autograd graphs during validation: memory use is like training and it is slower. With <code>@torch.no_grad()</code> the activations are freed immediately, so you can often double the validation batch size.</p>` }
    ],
    deepDive: `<p><b>🟣 What torch.optim.SGD actually computes</b> (dampening 0): <code>d = g + weight_decay·p</code>; <code>buf = momentum·buf + d</code> (the first step sets buf = d); with Nesterov, <code>step = d + momentum·buf</code>, else <code>step = buf</code>; <code>p −= lr·step</code>. Note that PyTorch's momentum form differs from the textbook "v = βv + (1−β)g" form: there is no (1 − β) factor, so the effective step is about lr/(1 − momentum).</p>
      <p><b>Optimizer state.</b> Adam/AdamW keep two extra tensors per parameter (first and second moments), so the optimizer state is 2× the model size in fp32. That state must be saved in checkpoints. <b>Parameter groups</b> let you exclude biases and norm weights from weight decay, or give a new head a 10× higher lr than a pretrained backbone.</p>
      <p><b>Loss reduction.</b> Losses default to <code>reduction='mean'</code> over the batch (and over non-ignored tokens for CrossEntropy). Summing instead makes the gradient scale with batch size, which silently changes the effective learning rate.</p>
      <p><b>Performance extras in 2.x.</b> <code>torch.compile(model)</code> often gives 1.3–2× speed-ups with no code changes; <code>fused=True</code> or the default foreach implementations make optimizer steps faster on GPU; <code>torch.backends.cuda.matmul.allow_tf32</code> (or <code>torch.set_float32_matmul_precision('high')</code>) uses TF32 tensor cores on Ampere+ GPUs.</p>`,
    aiEra: `<p><b>🤖 Writing loops with assistants.</b> Assistants reliably write the five lines, so review for what they omit: <code>model.eval()</code> and <code>no_grad</code> in validation, switching back to <code>model.train()</code> afterwards, <code>.item()</code> when logging, the loss's expected input format (logits vs probabilities), and where the scheduler steps. Frameworks such as PyTorch Lightning, Hugging Face <code>Trainer</code> and Accelerate write this loop for you; knowing the raw loop is what lets you debug them, and interviewers routinely ask you to write it from memory.</p>`,
    problems: [
      PR('sgd', {
        title: 'One Step of torch.optim.SGD', level: 'Medium', tags: ['optimizers', 'SGD', 'momentum', 'weight decay'], companies: ['Google', 'NVIDIA', 'Meta'],
        statement: `<p>Implement one step of PyTorch's SGD (dampening = 0) for a list of scalar parameters. Write <code>sgd_momentum_step(params, grads, bufs, lr, momentum, weight_decay, nesterov)</code> that returns <code>[new_params, new_bufs]</code>. For each parameter:</p>
          <ol><li><code>d = g + weight_decay · p</code></li><li><code>buf = momentum · buf + d</code> (a fresh optimizer has buf = 0, which gives buf = d on the first step)</li><li><code>step = d + momentum · buf</code> if nesterov, else <code>step = buf</code></li><li><code>p = p − lr · step</code></li></ol>`,
        constraints: `<p>1 ≤ len(params) ≤ 10<sup>4</sup>; all lists have the same length. 0 ≤ momentum &lt; 1. Answers compared with a 1e-5 tolerance.</p>`,
        example: `<p><code>params=[1], grads=[0.5], bufs=[0], lr=0.1, momentum=0.9, wd=0, nesterov=False</code> → <code class="c-g">[[0.95], [0.5]]</code>.</p>
          <p>Same but <code>bufs=[0.5]</code>, <code>nesterov=True</code>: buf = 0.45 + 0.5 = 0.95, step = 0.5 + 0.9·0.95 = 1.355, p = 1 − 0.1355 → <code class="c-g">[[0.8645], [0.95]]</code>.</p>`,
        bruteWhy: `<p>A common wrong version uses the textbook "v = 0.9v + 0.1g" form or applies weight decay after the update. Both run and both train, but they do not match PyTorch, so results differ from the paper you are reproducing and the effective learning rate is off by up to 10×.</p>`,
        mcq: { q: `With momentum 0.9 and a constant gradient, PyTorch SGD's step size approaches...`, options: ['lr × g × 10', 'lr × g', 'lr × g × 0.9', 'lr × g / 10'], answer: 0, explain: `buf converges to g / (1 − 0.9) = 10g, so each step is lr·10g. This is why lr 0.1 with momentum 0.9 is a much bigger step than lr 0.1 without it.` },
        hints: [
          `Hint 1: Work one parameter at a time with zip(params, grads, bufs); return two new lists.`,
          `Hint 2: Weight decay here is L2 added to the gradient BEFORE momentum: d = g + wd·p.`,
          `Hint 3: Nesterov uses d + momentum·(new buf). Without Nesterov the step is just the new buf. Then p − lr·step.`
        ],
        approach: `<p>Translate the four lines of the PyTorch update rule directly, in order, for every parameter, and return the updated parameters together with the updated momentum buffers (which the caller must keep, exactly like the optimizer's <code>state_dict</code>).</p>`,
        dry: { head: ['step', 'd', 'buf', 'step size', 'p'], rows: [['start', '', '0.5', '', '1'], ['1. d = g + 0·p', '0.5', '', '', ''], ['2. buf = 0.9·0.5 + 0.5', '', '0.95', '', ''], ['3. nesterov: 0.5 + 0.9·0.95', '', '', '1.355', ''], ['4. p = 1 − 0.1·1.355', '', '', '', '0.8645']] },
        complexity: `<p>O(n) time; O(n) extra memory for the momentum buffers (one per parameter, which is why SGD+momentum costs one extra model-sized tensor of optimizer state).</p>`,
        followUps: ['How does AdamW handle weight decay differently from this L2 form?', 'What extra state would you need to save to resume this optimizer exactly?']
      })
    ]
  });

  // ===================== TOPIC 5: DEVICES, GPUs, MIXED PRECISION =====================
  topics.push({
    title: 'Devices, GPUs and Mixed Precision',
    analogy: `<p>A GPU is a <b>huge kitchen with thousands of cooks</b> far away from the shop (the CPU). Ingredients (tensors) must be shipped there before the cooks can work, and everything for one dish must be in the <i>same</i> kitchen. Mixed precision is like the cooks using <b>small measuring cups</b> for most steps because they are faster to fill, while the master recipe book is kept with exact measurements so small errors do not pile up.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Training is mostly big matrix multiplications, which GPUs do thousands at a time. PyTorch runs an operation on whatever device its inputs live on, so your job is to put the <b>model and every batch on the same device</b>.</p>
      <pre>device = 'cuda' if torch.cuda.is_available() else ('mps' if torch.backends.mps.is_available() else 'cpu')
model = model.to(device)          # moves parameters and buffers (in place for modules)
xb = xb.to(device)                # tensors are NOT moved in place: reassign!</pre>
      <p>If you forget one, you get <span class="c-r">"Expected all tensors to be on the same device, but found at least two devices, cuda:0 and cpu"</span>. Create the optimizer <b>after</b> moving the model, and use <code>map_location</code> when loading checkpoints on a different machine.</p>
      <h4>Number formats</h4>
      ${H.table(['dtype', 'bits (exponent / mantissa)', 'largest value', 'used for'], [
        ['float32', '8 / 23', '≈ 3.4 × 10³⁸', 'default weights, optimizer state'],
        ['float16 (fp16)', '5 / 10', '<span class="c-r">65,504</span>', 'older GPUs (V100, T4): needs loss scaling'],
        ['bfloat16 (bf16)', '8 / 7', '≈ 3.4 × 10³⁸', 'Ampere (A100) and newer, TPUs: same range as fp32, no scaling needed'],
        ['TF32', 'fp32 storage, 10-bit mantissa inside matmuls', 'as fp32', 'free speed-up for fp32 matmuls on Ampere+']
      ])}
      <h4>Automatic mixed precision (AMP)</h4>
      <p><code>with torch.autocast(device_type='cuda', dtype=torch.bfloat16):</code> runs matmuls and convolutions in 16-bit, while keeping precision-sensitive ops (softmax, losses, norms, reductions) in float32. Weights stay float32, so updates do not get rounded away. Typical result: around 2× faster training and much less activation memory.</p>
      <p>With <b>fp16</b> small gradients underflow to zero (fp16 cannot represent values below about 6 × 10⁻⁸). The fix is <b>dynamic loss scaling</b> with <code>torch.amp.GradScaler</code>: multiply the loss by a big factor (65,536 by default) before backward, divide the gradients back before the step, and if any gradient became inf/NaN, <b>skip that step and halve the scale</b>. After 2,000 clean steps in a row it doubles the scale again. With bf16 you normally do not need a scaler.</p>`,
    clues: [
      '"Expected all tensors to be on the same device" → a batch, a new tensor (torch.zeros without device=) or the model was not moved',
      '"CUDA out of memory" → smaller batch, gradient accumulation, mixed precision, activation checkpointing, free graphs (no_grad in eval)',
      'Loss becomes NaN only when fp16 is turned on → overflow above 65,504 or underflow: use bf16 or GradScaler',
      'GPU utilisation 30% → input pipeline or CPU-GPU syncs (.item(), print) every step are the bottleneck',
      '"Train a model 2× faster on an A100 with no accuracy loss" → bf16 autocast + TF32 + torch.compile',
      'Timing a GPU op with time.time() gives tiny numbers → kernels run asynchronously: call torch.cuda.synchronize()'
    ],
    code: { lang: 'python', title: 'Mixed-precision training step in PyTorch 2.x (shown, not run here)', code: `import torch

device = 'cuda'
model = model.to(device)
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)   # after .to(device)
torch.set_float32_matmul_precision('high')                   # allow TF32 matmuls

# --- bf16 (A100/H100/TPU): no scaler needed ---
for xb, yb in train_dl:
    xb, yb = xb.to(device, non_blocking=True), yb.to(device, non_blocking=True)
    optimizer.zero_grad(set_to_none=True)
    with torch.autocast(device_type='cuda', dtype=torch.bfloat16):
        loss = loss_fn(model(xb), yb)
    loss.backward()                 # outside autocast; grads are fp32 like the weights
    optimizer.step()

# --- fp16 (V100/T4): dynamic loss scaling ---
scaler = torch.amp.GradScaler('cuda')        # init_scale=65536, growth_interval=2000
for xb, yb in train_dl:
    xb, yb = xb.to(device), yb.to(device)
    optimizer.zero_grad(set_to_none=True)
    with torch.autocast(device_type='cuda', dtype=torch.float16):
        loss = loss_fn(model(xb), yb)
    scaler.scale(loss).backward()            # backward on loss * scale
    scaler.unscale_(optimizer)               # real grads, needed before clipping
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    scaler.step(optimizer)                   # skipped if any grad is inf/NaN
    scaler.update()                          # halve on overflow, grow after 2000 good steps
` },
    viz: {
      title: 'GradScaler reacting to overflows',
      input: '0 0 1 0 0 0 1 1 0 0',
      inputLabel: 'one flag per step: 1 = gradients overflowed (inf/NaN), 0 = clean   (growth interval = 3 here)',
      gen: function (input) {
        var f = nums(input, 'the 0/1 flags', 16);
        if (f.some(function (x) { return x !== 0 && x !== 1; })) throw new Error('Use only 0 and 1');
        var scale = 65536, good = 0, skipped = 0, F = [], hist = [];
        F.push({ narr: 'GradScaler starts at scale 65,536 (2¹⁶). Every step, the loss is multiplied by the scale before <code>backward()</code>, so tiny fp16 gradients do not underflow to zero. Here the growth interval is 3 steps (2,000 in PyTorch) so you can see growth.', parts: [{ type: 'vars', vals: { scale: scale, 'good steps in a row': 0, skipped: 0 } }] });
        f.forEach(function (bad, t) {
          var msg;
          if (bad) { scale /= 2; good = 0; skipped++; msg = 'Step ' + t + ': an inf/NaN appeared in the unscaled gradients. <span class="c-r"><code>scaler.step</code> skips the optimizer step</span> (the weights stay unchanged) and the scale is halved to ' + scale + '.'; }
          else { good++; msg = 'Step ' + t + ': all gradients finite. The optimizer step runs on the unscaled gradients.'; if (good === 3) { scale *= 2; good = 0; msg += ' That is 3 clean steps in a row, so the scale <b>doubles</b> to ' + scale + ' (try to use more of fp16\'s range).'; } }
          hist.push(Math.log2(scale));
          F.push({ narr: msg, parts: [{ type: 'vars', vals: { scale: scale, 'good steps in a row': good, skipped: skipped }, hl: { scale: bad ? 'bad' : 'ok' } },
            { type: 'bars', label: 'log₂(scale) after each step', values: hist.slice(), hl: one(t, bad ? 'bad' : 'cur') }] });
        });
        F.push({ narr: 'Done: ' + skipped + ' of ' + f.length + ' steps were skipped. A few skips early in training are normal. If the scale keeps falling towards 1 and most steps are skipped, the model really is producing inf/NaN (a bug or lr problem), not just an fp16 range issue.', parts: [{ type: 'vars', vals: { 'final scale': scale, skipped: skipped } }] });
        return F;
      }
    },
    examples: [
      { title: 'How much GPU memory does training need?', html: `<p>Rule of thumb for AdamW in fp32: 4 bytes weights + 4 gradients + 8 optimizer state = <b>16 bytes per parameter</b>, before activations. A 1-billion-parameter model needs about 16 GB just for that, and mixed precision does not shrink it much (the fp32 master weights and Adam state stay). That is why large models need sharding (FSDP, DeepSpeed ZeRO) or parameter-efficient fine-tuning (LoRA).</p>` },
      { title: 'bf16 vs fp16 range', html: `<p>An attention logit of 70,000 overflows fp16 (max 65,504) to <code>inf</code>, and softmax gives NaN. In bf16 it is fine: 70,000 rounds to 70,144 because bf16 keeps fp32's exponent range but only about 3 significant decimal digits. That is why bf16 is the default for training transformers today.</p>` },
      { title: 'A sneaky device bug', html: `<p><code>mask = torch.ones(T, T).tril()</code> inside <code>forward</code> creates a CPU tensor every call; on a GPU the next op fails. Fix: <code>torch.ones(T, T, device=x.device)</code>, or create it once in <code>__init__</code> with <code>register_buffer</code> so <code>model.to(device)</code> moves it.</p>` }
    ],
    deepDive: `<p><b>🟣 Asynchronous execution.</b> CUDA calls return immediately and kernels queue on a stream. Anything that needs a value on the CPU (<code>.item()</code>, <code>.cpu()</code>, <code>print(tensor)</code>, Python <code>if</code> on a tensor) forces a <b>synchronisation</b> and stalls the queue. Log every N steps instead of every step. <code>pin_memory=True</code> + <code>non_blocking=True</code> lets host-to-device copies overlap with compute.</p>
      <p><b>Memory tools.</b> <code>torch.cuda.max_memory_allocated()</code>, <code>torch.cuda.memory_summary()</code> and the memory snapshot visualiser show where memory goes. The caching allocator keeps freed blocks, so <code>nvidia-smi</code> shows more than is in use; <code>torch.cuda.empty_cache()</code> rarely fixes a real OOM. Activation checkpointing, smaller micro-batches with gradient accumulation, and fused attention (<code>F.scaled_dot_product_attention</code>) are the real levers.</p>
      <p><b>Lower precision.</b> H100-class GPUs add FP8 training via libraries such as NVIDIA Transformer Engine and torchao; int8/int4 are mostly for inference (quantisation). More than one GPU: <b>DDP</b> replicates the model and averages gradients; <b>FSDP</b> shards parameters, gradients and optimizer state across GPUs; both are launched with <code>torchrun</code>.</p>`,
    aiEra: `<p><b>🤖 Assistants and hardware.</b> Generated code often hard-codes <code>.cuda()</code> (breaks on Macs and CPU-only CI), keeps using the deprecated <code>torch.cuda.amp.autocast</code>/<code>GradScaler</code> spellings (PyTorch 2.x prefers <code>torch.autocast(device_type=...)</code> and <code>torch.amp.GradScaler('cuda')</code>), or adds a GradScaler to bf16 training where it does nothing. Ask for a <code>device</code> variable passed everywhere and a flag for the precision. For capacity questions ("will a 7B fine-tune fit on one 24 GB GPU?") have the assistant show the bytes-per-parameter arithmetic, then check it yourself: with full AdamW it does not fit (≈ 112 GB); with LoRA on a 4-bit base model it does.</p>`,
    problems: [
      PR('scaler', {
        title: 'Simulate Dynamic Loss Scaling', level: 'Medium', tags: ['mixed precision', 'GradScaler', 'fp16'], companies: ['NVIDIA', 'Microsoft', 'Meta'],
        statement: `<p>Simulate <code>torch.amp.GradScaler</code> (growth_factor 2, backoff_factor 0.5). Write <code>simulate_grad_scaler(init_scale, growth_interval, overflow)</code>, where <code>overflow[t]</code> says whether step t produced inf/NaN gradients. Return <code>[final_scale, skipped_steps]</code>.</p>
          <ul><li>Overflow: the optimizer step is skipped, the scale is halved, and the count of consecutive good steps resets to 0.</li>
          <li>No overflow: the step runs and the good-step count goes up by 1; when it reaches <code>growth_interval</code>, the scale doubles and the count resets to 0.</li></ul>`,
        constraints: `<p>0 ≤ len(overflow) ≤ 10<sup>5</sup>; 1 ≤ growth_interval ≤ 10<sup>4</sup>; init_scale is a power of two. Ignore any lower limit on the scale.</p>`,
        example: `<p><code>init_scale = 65536, growth_interval = 2, overflow = [False, True, False, False]</code> → <code class="c-g">[65536, 1]</code>. After step 0 one good step; step 1 overflows (scale 32768, count 0, one skip); steps 2–3 are two good steps, so it doubles back to 65536.</p>`,
        bruteWhy: `<p>A static scale (always 1024, say) is simpler but either still underflows small gradients (too low) or overflows constantly (too high), and the right value changes during training. Dynamic scaling probes upward and backs off automatically.</p>`,
        mcq: { q: `Why does GradScaler skip the optimizer step when it finds an inf gradient?`, options: ['An inf gradient would corrupt the weights; one skipped step is cheap', 'To save time on that step', 'Because the learning rate is too low', 'Because the model is in eval mode'], answer: 0, explain: `Applying inf or NaN would permanently break the weights (and Adam's moments). Skipping one step and lowering the scale costs almost nothing.` },
        hints: [
          `Hint 1: You need three variables: scale, a counter of consecutive good steps, and the number of skipped steps.`,
          `Hint 2: On overflow: scale *= 0.5, counter = 0, skipped += 1. Otherwise counter += 1.`,
          `Hint 3: Check growth right after incrementing: if counter == growth_interval then scale *= 2 and counter = 0. An empty list returns [init_scale, 0].`
        ],
        approach: `<p>Walk through the steps keeping the scale, the "growth tracker" (consecutive clean steps) and a skip counter, applying the backoff or growth rule at each step, exactly as <code>scaler.update()</code> does after each <code>scaler.step()</code>.</p>`,
        dry: { head: ['t', 'overflow?', 'scale', 'good in a row', 'skipped'], rows: [['start', '', '65536', '0', '0'], ['0', 'no', '65536', '1', '0'], ['1', 'yes', '32768', '0', '1'], ['2', 'no', '32768', '1', '1'], ['3', 'no', '65536 (grow)', '0', '1']] },
        complexity: `<p>O(T) time for T steps, O(1) space.</p>`,
        followUps: ['Why must you call scaler.unscale_(optimizer) before gradient clipping?', 'Why is a GradScaler usually unnecessary with bf16?']
      })
    ]
  });

  // ===================== TOPIC 6: REGULARISATION + LR SCHEDULES =====================
  topics.push({
    title: 'Dropout, Weight Decay, Early Stopping and Learning-Rate Schedules',
    analogy: `<p>Training a model is like <b>studying for an exam</b>. Memorising last year's paper word for word (overfitting) fails on new questions. <b>Dropout</b> is studying with random pages missing so you cannot rely on one fact. <b>Weight decay</b> is a rule to keep notes short and simple. <b>Early stopping</b> is taking practice tests and stopping when your score stops improving. A <b>learning-rate schedule</b> is reading quickly at first, then slowing down to polish the details just before the exam.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> ai20 explained <i>why</i> overfitting happens and the maths of L2 and early stopping. Here is how each is switched on in PyTorch and how to choose settings.</p>
      ${H.table(['tool', 'PyTorch', 'typical value', 'what to know'], [
        ['Dropout', '<code>nn.Dropout(p)</code> in the model', 'p = 0.1 (transformers) to 0.5 (big MLP heads)', 'active only in <code>train()</code>; survivors are scaled by 1/(1 − p) so eval needs no change'],
        ['Weight decay', '<code>AdamW(params, weight_decay=0.01)</code>', '0.01–0.1', 'AdamW decays weights directly; usually exclude biases and norm weights'],
        ['Early stopping', 'your loop (or a callback)', 'patience 3–10 epochs', 'monitor validation loss; keep the best checkpoint, not the last'],
        ['Data augmentation', 'transforms in the Dataset', 'flips, crops, mixup', 'often the strongest regulariser for images'],
        ['Label smoothing', '<code>CrossEntropyLoss(label_smoothing=0.1)</code>', '0.05–0.1', 'stops over-confident logits']
      ])}
      <h4>Learning-rate schedules</h4>
      <p>A scheduler changes <code>optimizer.param_groups[i]['lr']</code> as training goes. Call <code>scheduler.step()</code> <b>after</b> <code>optimizer.step()</code>: once per batch for step-based schedules (warm-up, OneCycle, Hugging Face schedules), once per epoch for epoch-based ones.</p>
      ${H.table(['scheduler', 'shape', 'formula / behaviour'], [
        ['<code>StepLR(step_size, gamma)</code>', 'staircase', 'lr = base · gamma<sup>⌊epoch / step_size⌋</sup>'],
        ['<code>CosineAnnealingLR(T_max, eta_min)</code>', 'smooth decay', 'η = η<sub>min</sub> + (base − η<sub>min</sub>)(1 + cos(π t / T<sub>max</sub>)) / 2'],
        ['<code>CosineAnnealingWarmRestarts(T_0, T_mult)</code>', 'saw-tooth cosines', 'restarts at base lr; each cycle T_mult × longer'],
        ['<code>LinearLR</code> + <code>SequentialLR</code>', 'warm-up then decay', 'standard for transformers (ai20 derived warm-up + cosine)'],
        ['<code>OneCycleLR(max_lr, total_steps)</code>', 'up then down', 'fast training for CNNs; step every batch'],
        ['<code>ReduceLROnPlateau(factor, patience)</code>', 'reactive', 'call <code>step(val_loss)</code>; cuts lr when the metric stops improving']
      ])}`,
    clues: [
      '"Train accuracy 99%, validation 70%" → overfitting: augmentation, dropout, weight decay, early stopping, more data',
      '"Validation loss went up after epoch 8 but we saved epoch 30" → keep the best checkpoint (early stopping with restore)',
      '"Detected call of lr_scheduler.step() before optimizer.step()" warning → wrong order: the first lr value is skipped',
      'Loss plateaus, then drops sharply exactly at epochs 30 and 60 → a StepLR schedule at work',
      '"Fine-tuning a transformer: what schedule?" → linear warm-up (a few % of steps) then linear or cosine decay',
      'Adam with weight_decay vs AdamW → Adam adds L2 to the gradient (scaled by the adaptive denominator); AdamW decouples it'
    ],
    code: { lang: 'python', title: 'Regularisation and schedulers in PyTorch 2.x (shown, not run here)', code: `import torch
from torch import nn

# 1) weight decay only on matrices, not on biases or norm weights
decay, no_decay = [], []
for name, p in model.named_parameters():
    if not p.requires_grad:
        continue
    (no_decay if p.ndim < 2 else decay).append(p)
optimizer = torch.optim.AdamW([
    {'params': decay, 'weight_decay': 0.05},
    {'params': no_decay, 'weight_decay': 0.0},
], lr=3e-4)

# 2) warm-up for 500 steps, then cosine decay to 0, stepped every batch
total_steps = len(train_dl) * num_epochs
warmup = torch.optim.lr_scheduler.LinearLR(optimizer, start_factor=0.01, total_iters=500)
cosine = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=total_steps - 500)
scheduler = torch.optim.lr_scheduler.SequentialLR(optimizer, [warmup, cosine], milestones=[500])

best, bad, patience = float('inf'), 0, 5
for epoch in range(num_epochs):
    model.train()
    for xb, yb in train_dl:
        optimizer.zero_grad(set_to_none=True)
        loss_fn(model(xb), yb).backward()
        optimizer.step()
        scheduler.step()                        # AFTER optimizer.step()
    val_loss, _ = evaluate(val_dl)              # model.eval() + no_grad inside
    if val_loss < best - 1e-4:                  # 3) early stopping with a min_delta
        best, bad = val_loss, 0
        torch.save(model.state_dict(), 'best.pt')
    else:
        bad += 1
        if bad >= patience:
            break
model.load_state_dict(torch.load('best.pt', weights_only=True))   # restore the BEST weights
` },
    viz: [{
      title: 'Early stopping watching the validation loss',
      input: '1.0 0.8 0.7 0.71 0.69 0.72 0.73 0.75 | 2 | 0.0',
      inputLabel: 'validation losses per epoch | patience | min_delta',
      gen: function (input) {
        var p = splitBar(input, 3, '1.0 0.8 0.7 | 2 | 0.0');
        var v = nums(p[0], 'the losses', 14), pat = Number(p[1]), md = Number(p[2]);
        if (!(pat >= 1) || Math.floor(pat) !== pat || !(md >= 0)) throw new Error('patience must be a whole number ≥ 1 and min_delta ≥ 0');
        var best = v[0], be = 0, wait = 0, F = [];
        F.push({ narr: 'Epoch 0: validation loss ' + v[0] + '. That is our first <b>best</b>; save a checkpoint.', parts: [{ type: 'bars', label: 'validation loss', values: v.slice(0, 1), hl: one(0, 'sel') }, { type: 'vars', vals: { best: best, 'best epoch': 0, waited: 0, patience: pat } }] });
        for (var e = 1; e < v.length; e++) {
          var improved = v[e] < best - md, msg;
          if (improved) { best = v[e]; be = e; wait = 0; msg = 'Epoch ' + e + ': ' + v[e] + ' beats the best by more than min_delta. <span class="c-g">New best</span>: save a checkpoint, reset the counter.'; }
          else { wait++; msg = 'Epoch ' + e + ': ' + v[e] + ' is not an improvement of more than ' + md + ' over ' + best + '. Counter ' + wait + ' / ' + pat + '.'; }
          var h = {}; h[be] = 'sel'; h[e] = improved ? 'ok' : 'bad';
          var stop = !improved && wait >= pat;
          if (stop) msg += ' Patience used up: <b>stop</b> and reload the checkpoint from epoch ' + be + '.';
          F.push({ narr: msg, parts: [{ type: 'bars', label: 'validation loss', values: v.slice(0, e + 1), hl: h }, { type: 'vars', vals: { best: best, 'best epoch': be, waited: wait, patience: pat }, hl: { waited: stop ? 'bad' : 'cur' } }] });
          if (stop) break;
        }
        if (F.length < 4) F.push({ narr: 'Add more epochs to see the counter at work.', parts: [{ type: 'vars', vals: { best: best, 'best epoch': be } }] });
        return F;
      }
    }, {
      title: 'Learning-rate schedules side by side',
      input: '0.1 | 12',
      inputLabel: 'base lr | number of epochs (≤ 24)',
      gen: function (input) {
        var p = splitBar(input, 2, '0.1 | 12'), base = Number(p[0]), E = Number(p[1]);
        if (!(base > 0) || !(E >= 4 && E <= 24) || Math.floor(E) !== E) throw new Error('base lr > 0 and 4 ≤ epochs ≤ 24');
        var step = [], cos = [], restart = [], lin = [], F = [], labels = [];
        for (var e = 0; e < E; e++) {
          labels.push('e' + e);
          step.push(r4(base * Math.pow(0.5, Math.floor(e / Math.max(1, Math.floor(E / 3))))));
          cos.push(r4(base * (1 + Math.cos(Math.PI * e / E)) / 2));
          var Ti = Math.max(2, Math.floor(E / 4)), tc = e; while (tc >= Ti) { tc -= Ti; Ti *= 2; }
          restart.push(r4(base * (1 + Math.cos(Math.PI * tc / Ti)) / 2));
          var w = Math.max(1, Math.floor(E / 6));
          lin.push(r4(e < w ? base * (e + 1) / w : base * (E - e) / (E - w)));
        }
        F.push({ narr: '<b>StepLR</b> (gamma 0.5 every ' + Math.max(1, Math.floor(E / 3)) + ' epochs): long flat stretches, then sudden drops. Loss curves often show a matching sudden drop.', parts: [{ type: 'bars', label: 'StepLR', values: step, idxLabels: labels }] });
        F.push({ narr: '<b>CosineAnnealingLR</b> (T_max = ' + E + '): starts gently, decays fastest in the middle, and flattens near zero at the end, which gives a "fine polishing" phase.', parts: [{ type: 'bars', label: 'cosine', values: cos, idxLabels: labels }] });
        F.push({ narr: '<b>CosineAnnealingWarmRestarts</b> (T_0 = ' + Math.max(2, Math.floor(E / 4)) + ', T_mult = 2): jumps back to the base lr at each restart, with longer cycles each time. Restarts can shake the model out of a poor region.', parts: [{ type: 'bars', label: 'warm restarts', values: restart, idxLabels: labels }] });
        F.push({ narr: '<b>Linear warm-up then linear decay</b> (Hugging Face\'s <code>get_linear_schedule_with_warmup</code>): the default for fine-tuning transformers. The warm-up protects pretrained weights from big early steps while Adam\'s statistics settle.', parts: [{ type: 'bars', label: 'warm-up + linear decay', values: lin, idxLabels: labels }] });
        return F;
      }
    }],
    examples: [
      { title: 'Inverted dropout by hand', html: `<p>x = [1, 2, 3, 4], p = 0.5, mask = [1, 0, 1, 0]. Train mode output: [1/0.5, 0, 3/0.5, 0] = <b>[2, 0, 6, 0]</b>. The expected value of each unit is unchanged (½ × 2x = x). Eval mode output: [1, 2, 3, 4] unchanged. Because the scaling happens during training, nothing needs rescaling at inference.</p>` },
      { title: 'StepLR, the ResNet classic', html: `<p>base 0.1, step_size 30, gamma 0.1 → epochs 0–29: 0.1; 30–59: 0.01; 60–89: 0.001. At epoch 95 the lr is 0.1 × 0.1³ = <b>0.0001</b>.</p>` },
      { title: 'Early stopping with min_delta', html: `<p>Val losses 1.0, 0.8, 0.7, 0.69, 0.68, 0.75 with patience 2 and min_delta 0.05: 0.69 and 0.68 are "improvements" of less than 0.05 over 0.7, so they count as waiting. Training stops at epoch 4 with the best checkpoint from epoch 2. Without min_delta it would keep going on tiny noisy gains.</p>` }
    ],
    deepDive: `<p><b>🟣 Dropout details.</b> <code>nn.Dropout</code> draws a fresh Bernoulli mask every forward call; <code>F.dropout(x, p, training=self.training)</code> is the functional form, and forgetting <code>training=self.training</code> leaves it on in eval. Large pretrained LLMs are often trained with dropout 0 because one pass over huge data does not overfit; dropout matters more for small data and fine-tuning heads.</p>
      <p><b>Weight decay vs L2.</b> For plain SGD, L2 in the loss and weight decay are the same thing. For Adam they are not: L2 gradients get divided by √v, so weights with large gradients are barely regularised. AdamW applies <code>p −= lr · wd · p</code> separately (Loshchilov &amp; Hutter), which is why <code>AdamW</code> is the default. Norm layers' scales and biases are usually excluded from decay.</p>
      <p><b>Schedulers and state.</b> Schedulers have a <code>state_dict</code> (current step) that must be saved with checkpoints, or a resumed run restarts warm-up. <code>ReduceLROnPlateau</code> cuts the lr after <i>more than</i> <code>patience</code> bad epochs (default threshold 1e-4, relative). Chained schedulers (<code>SequentialLR</code>, <code>ChainedScheduler</code>) compose warm-up and decay. The LR range test ("LR finder") sweeps lr exponentially over a few hundred steps and picks a value somewhat below where the loss starts to rise.</p>`,
    aiEra: `<p><b>🤖 Assistants and hyperparameters.</b> An assistant gives reasonable defaults (AdamW, lr 3e-4 or 2e-5 for fine-tuning, warm-up 3–10%, cosine decay, weight decay 0.01), and that is often good enough to start. What it cannot know is your data: overfitting depends on dataset size and label noise. Let a sweep tool (Optuna, Weights &amp; Biases sweeps) or a few short runs decide, and keep the early-stopping signal on a validation set that the assistant-written code never trains on. Check that "early stopping" code restores the best weights; many snippets just stop and keep the last ones.</p>`,
    problems: [
      PR('early', {
        title: 'Early Stopping With min_delta', level: 'Easy', tags: ['early stopping', 'regularisation', 'training loop'], companies: ['Microsoft', 'Hugging Face'],
        statement: `<p>Write <code>early_stopping(val_losses, patience, min_delta)</code>. Epoch 0 sets the first best. At each later epoch, the loss is an improvement only if it is <b>less than best − min_delta</b>; an improvement updates the best and resets the waiting counter, anything else adds 1 to it. When the counter reaches <code>patience</code>, training stops at that epoch.</p>
          <p>Return <code>[best_epoch, stop_epoch]</code>, with <code>stop_epoch = -1</code> if training never stops.</p>`,
        constraints: `<p>1 ≤ len(val_losses) ≤ 10<sup>5</sup>; 1 ≤ patience; 0 ≤ min_delta.</p>`,
        example: `<p><code>[1.0, 0.8, 0.7, 0.71, 0.72, 0.73]</code>, patience 2, min_delta 0 → <code class="c-g">[2, 4]</code>: best 0.7 at epoch 2, then two non-improvements (epochs 3 and 4) → stop at epoch 4, reload epoch 2.</p>
          <p><code>[1, 0.9, 0.8, 0.7]</code>, patience 1 → <code class="c-y">[3, -1]</code>: it keeps improving.</p>`,
        bruteWhy: `<p>Stopping at the first epoch whose loss goes up is too jumpy: validation loss is noisy, so a single bad epoch often comes before further improvement. Training to the end and keeping the last weights wastes compute and keeps an overfitted model.</p>`,
        mcq: { q: `After early stopping triggers, which weights should you use?`, options: ['The checkpoint from the best validation epoch', 'The weights from the last epoch', 'The average of all epochs', 'The initial weights'], answer: 0, explain: `The last epochs were by definition not improving, so the best-epoch checkpoint generalises best. Hugging Face's load_best_model_at_end=True does exactly this.` },
        hints: [
          `Hint 1: Keep three things: the best loss so far, its epoch, and how many epochs you have waited since then.`,
          `Hint 2: "Improvement" means val < best − min_delta (strictly). Equal or tiny gains count as waiting.`,
          `Hint 3: Check the counter right after incrementing; return [best_epoch, epoch] the moment it reaches patience, and [best_epoch, -1] after the loop.`
        ],
        approach: `<p>One pass with a best value and a patience counter, exactly as an early-stopping callback works: improvements (by more than min_delta) reset the counter and mark the epoch to restore; the first time the counter reaches patience, stop.</p>`,
        dry: { head: ['epoch', 'loss', 'improves?', 'best (epoch)', 'waited'], rows: [['0', '1.0', 'first', '1.0 (0)', '0'], ['1', '0.8', 'yes', '0.8 (1)', '0'], ['2', '0.7', 'yes', '0.7 (2)', '0'], ['3', '0.71', 'no', '0.7 (2)', '1'], ['4', '0.72', 'no', '0.7 (2)', '2 → stop at 4']] },
        complexity: `<p>O(E) time over E epochs, O(1) space.</p>`,
        followUps: ['How would you support mode="max" for a metric like accuracy?', 'Should early stopping use validation loss or the metric you report? What if they disagree?']
      })
    ]
  });

  // ===================== TOPIC 7: CHECKPOINTS + TRANSFER LEARNING =====================
  topics.push({
    title: 'Checkpoints, Transfer Learning and Fine-Tuning With Hugging Face',
    analogy: `<p>Transfer learning is <b>hiring an experienced chef</b> instead of teaching someone to cook from zero. They already know knife skills, heat and seasoning (the pretrained backbone). You only teach them your restaurant's menu (a new head), at first without letting them change their basic habits (frozen backbone), then gently letting them adapt (fine-tuning with a small learning rate). A checkpoint is the <b>save game</b>: if the power goes out, you reload and continue from exactly where you were, with the chef's notes (optimizer state) as well as the dishes.</p>`,
    explain: `<p><b>🟢 The plain idea, part 1: checkpoints.</b> Save <code>state_dict</code>s (dictionaries of tensors), not whole pickled models. To <b>resume</b> training exactly you need more than the weights:</p>
      ${H.table(['piece', 'why it is needed'], [
        ['<code>model.state_dict()</code>', 'the weights and buffers (e.g. BatchNorm running stats)'],
        ['<code>optimizer.state_dict()</code>', 'momentum / Adam moments; without them the next steps behave like a fresh optimizer'],
        ['<code>scheduler.state_dict()</code>', 'where you are in the lr schedule (else warm-up restarts)'],
        ['<code>scaler.state_dict()</code>', 'the current fp16 loss scale'],
        ['epoch / step, best metric', 'where to continue and what "best" means'],
        ['RNG states', 'optional: exact same shuffles and dropout masks after resume']
      ])}
      <p>For inference only the model weights are needed. Load with <code>torch.load(path, map_location='cpu', weights_only=True)</code>: since PyTorch 2.6 <code>weights_only=True</code> is the default, because loading arbitrary pickles can execute code. Hugging Face models use <b>safetensors</b> files for the same reason.</p>
      <p><b>🟢 Part 2: transfer learning.</b> A model pretrained on a huge dataset has learned general features (edges and textures for images, grammar and meaning for text). For a new task:</p>
      <ol>
        <li><b>Feature extraction:</b> freeze the backbone (<code>requires_grad_(False)</code>), replace the head with a new layer for your classes, and train only the head. Fast, works with little data.</li>
        <li><b>Full fine-tuning:</b> train everything with a small learning rate (about 1e-5 to 5e-5 for transformers, often 10× smaller than for the head), usually with warm-up.</li>
        <li><b>Gradual unfreezing / discriminative learning rates:</b> start with the head, then unfreeze the top layers, giving lower layers smaller learning rates.</li>
        <li><b>Parameter-efficient fine-tuning</b> (PEFT, e.g. LoRA): freeze everything and train small added matrices; covered in the fine-tuning module.</li>
      </ol>
      <p>With Hugging Face: <code>AutoModelForSequenceClassification.from_pretrained(name, num_labels=2)</code> loads the pretrained body and adds a new, randomly initialised classification head (it warns that some weights are newly initialised, which is expected). Passing <code>labels</code> to the model makes it return <code>outputs.loss</code>. The <code>Trainer</code> runs the whole loop (mixed precision, schedules, evaluation, checkpointing, best-model restore) from <code>TrainingArguments</code>.</p>`,
    clues: [
      '"Missing key(s) in state_dict: fc.weight … Unexpected key(s): module.fc.weight" → saved from DDP (module. prefix) or torch.compile (_orig_mod.) : strip the prefix',
      '"Resumed training but the loss jumped" → optimizer, scheduler or scaler state not restored, or model.train() not set',
      '"Only 500 labelled images" → transfer learning: freeze the backbone, train a new head, then fine-tune gently',
      '"Some weights of BertForSequenceClassification were not initialized … classifier.weight" → the new head is random: expected, fine-tune it',
      '"Fine-tuning destroyed the pretrained knowledge" → lr too high: use 1e-5 to 5e-5, warm-up, fewer epochs, or freeze/PEFT',
      'Loading a checkpoint fails with an unpickling error in PyTorch 2.6+ → weights_only=True default; save plain state_dicts'
    ],
    code: [
      { lang: 'python', title: 'Saving and resuming a checkpoint (shown, not run here)', code: `import torch

def save_checkpoint(path, model, optimizer, scheduler, scaler, epoch, best_val):
    torch.save({
        'model': model.state_dict(),
        'optimizer': optimizer.state_dict(),
        'scheduler': scheduler.state_dict(),
        'scaler': scaler.state_dict() if scaler is not None else None,
        'epoch': epoch,
        'best_val': best_val,
        'torch_rng': torch.get_rng_state(),
    }, path)

def load_checkpoint(path, model, optimizer, scheduler, scaler, device):
    ckpt = torch.load(path, map_location=device, weights_only=True)   # default in 2.6+
    state = ckpt['model']
    state = {k.removeprefix('_orig_mod.').removeprefix('module.'): v for k, v in state.items()}
    model.load_state_dict(state)                     # strict=True: fail loudly on mismatches
    optimizer.load_state_dict(ckpt['optimizer'])     # create the optimizer AFTER model.to(device)
    scheduler.load_state_dict(ckpt['scheduler'])
    if scaler is not None and ckpt['scaler'] is not None:
        scaler.load_state_dict(ckpt['scaler'])
    torch.set_rng_state(ckpt['torch_rng'])
    return ckpt['epoch'] + 1, ckpt['best_val']        # continue from the NEXT epoch
` },
      { lang: 'python', title: 'Transfer learning with torchvision (shown, not run here)', code: `import torch
from torch import nn
from torchvision.models import resnet50, ResNet50_Weights

weights = ResNet50_Weights.DEFAULT
model = resnet50(weights=weights)                    # pretrained on ImageNet
preprocess = weights.transforms()                    # the SAME resize/normalise as pretraining

for p in model.parameters():                         # 1) freeze the backbone
    p.requires_grad_(False)
model.fc = nn.Linear(model.fc.in_features, 5)        # 2) new head (2048 -> 5), trainable by default

optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=1e-3)
# ... train the head for a few epochs, then unfreeze the last block with a smaller lr:
for p in model.layer4.parameters():
    p.requires_grad_(True)
optimizer = torch.optim.AdamW([
    {'params': model.layer4.parameters(), 'lr': 1e-4},
    {'params': model.fc.parameters(), 'lr': 1e-3},
], weight_decay=0.01)
` },
      { lang: 'python', title: 'Fine-tuning a text classifier with Hugging Face (shown, not run here)', code: `import numpy as np
from datasets import load_dataset
from transformers import (AutoTokenizer, AutoModelForSequenceClassification,
                          DataCollatorWithPadding, Trainer, TrainingArguments)

name = 'distilbert-base-uncased'
ds = load_dataset('imdb')
tok = AutoTokenizer.from_pretrained(name)
ds = ds.map(lambda b: tok(b['text'], truncation=True, max_length=256), batched=True)

model = AutoModelForSequenceClassification.from_pretrained(name, num_labels=2)  # new head

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    return {'accuracy': float((np.argmax(logits, axis=-1) == labels).mean())}

args = TrainingArguments(
    output_dir='out', learning_rate=2e-5, per_device_train_batch_size=16,
    num_train_epochs=2, weight_decay=0.01, warmup_ratio=0.06, lr_scheduler_type='linear',
    eval_strategy='epoch', save_strategy='epoch', load_best_model_at_end=True,
    metric_for_best_model='accuracy', bf16=True, seed=42,
)
trainer = Trainer(model=model, args=args, train_dataset=ds['train'], eval_dataset=ds['test'],
                  data_collator=DataCollatorWithPadding(tok), compute_metrics=compute_metrics)
trainer.train()                  # resume later with trainer.train(resume_from_checkpoint=True)
trainer.save_model('final')      # model.safetensors + config; save tok too: tok.save_pretrained('final')
` }
    ],
    codeTitle: ['Checkpoints', 'torchvision transfer learning', 'Hugging Face fine-tuning'],
    viz: {
      title: 'Freezing a backbone and adding a new head',
      input: '768 512 256 | 3',
      inputLabel: 'backbone layer sizes | number of classes for the new head',
      gen: function (input) {
        var p = splitBar(input, 2, '768 512 256 | 3');
        var d = ints(p[0], 'layer sizes', 6), nc = Number(p[1]);
        if (d.length < 1 || d.some(function (x) { return x < 1 || x > 100000; })) throw new Error('Layer sizes must be 1 … 100000');
        if (!(nc >= 1) || Math.floor(nc) !== nc) throw new Error('Number of classes must be a whole number ≥ 1');
        var nodes = [], edges = [], rows = [], bb = 0, F = [];
        d.forEach(function (s, i) { nodes.push({ id: 'L' + i, label: String(s), x: 8 + i * (70 / Math.max(1, d.length)), y: 25, shape: 'box', w: 12 }); if (i) edges.push(['L' + (i - 1), 'L' + i]); });
        nodes.push({ id: 'H', label: 'head ' + nc, x: 92, y: 25, shape: 'box', w: 14 }); edges.push(['L' + (d.length - 1), 'H']);
        for (var i = 0; i + 1 < d.length; i++) { var c = d[i] * d[i + 1] + d[i + 1]; bb += c; rows.push(['Linear(' + d[i] + ', ' + d[i + 1] + ')', d[i] + '·' + d[i + 1] + ' + ' + d[i + 1], c, 'frozen']); }
        var head = d[d.length - 1] * nc + nc;
        F.push({ narr: 'A pretrained backbone with layer sizes ' + d.join(' → ') + '. Its weights already encode useful features learned from a huge dataset.', parts: [{ type: 'graph', label: 'model', directed: true, height: 50, nodes: nodes.slice(0, d.length), edges: edges.slice(0, Math.max(0, d.length - 1)) }] });
        F.push({ narr: 'Count the backbone parameters: each Linear(in, out) has in·out weights plus out biases. Total <b>' + bb.toLocaleString('en-US') + '</b>.', parts: [{ type: 'table', label: 'backbone', columns: ['layer', 'weights + biases', 'count', 'status'], rows: rows.length ? rows : [['(input only)', '-', 0, '-']] }] });
        var hl = {}; d.forEach(function (_, i) { hl['L' + i] = 'done'; });
        F.push({ narr: 'Freeze it: <code>for p in backbone.parameters(): p.requires_grad_(False)</code>. No gradients are computed or stored for these weights, and the optimizer never changes them.', parts: [{ type: 'graph', label: 'model', directed: true, height: 50, nodes: nodes.slice(0, d.length), edges: edges.slice(0, Math.max(0, d.length - 1)), hl: hl, tags: { L0: 'frozen' } }] });
        hl.H = 'ok';
        F.push({ narr: 'Add a new head Linear(' + d[d.length - 1] + ', ' + nc + ') with ' + head.toLocaleString('en-US') + ' parameters, randomly initialised and trainable. Only <b>' + head.toLocaleString('en-US') + ' of ' + (bb + head).toLocaleString('en-US') + '</b> parameters (' + r4(100 * head / (bb + head)) + '%) are trained, so training is fast and needs far less data.', parts: [{ type: 'graph', label: 'model', directed: true, height: 50, nodes: nodes, edges: edges, hl: hl, tags: { H: 'trainable' } }, { type: 'vars', vals: { total: bb + head, trainable: head, frozen: bb }, hl: { trainable: 'ok' } }] });
        F.push({ narr: 'Phase 2 (optional): unfreeze the top layers with a learning rate about 10× smaller than the head\'s, so the pretrained features adapt gently instead of being overwritten ("catastrophic forgetting").', parts: [{ type: 'text', label: 'recipe', html: 'head lr 1e-3 → top block lr 1e-4 → lower blocks frozen or lr 1e-5' }] });
        return F;
      }
    },
    examples: [
      { title: 'ResNet-50 head swap', html: `<p>ResNet-50's final layer is <code>Linear(2048, 1000)</code>: 2,048,000 weights + 1,000 biases = 2,049,000 parameters, out of about 25.6 million. Replacing it with <code>Linear(2048, 5)</code> gives 10,245 trainable parameters: you can train it on a laptop in minutes.</p>` },
      { title: 'Resuming without optimizer state', html: `<p>You reload weights at step 10,000 but create a fresh AdamW. Its moment estimates start at zero, so for the next steps the bias-corrected update is about lr × sign(g) for every weight: a burst of large, uniform steps that shows as a loss spike. Saving <code>optimizer.state_dict()</code> avoids it.</p>` },
      { title: 'Prefix mismatch when loading', html: `<p>A model trained with DDP saves keys like <code>module.encoder.weight</code>; after <code>torch.compile</code> keys start with <code>_orig_mod.</code>. Loading into a plain model with <code>strict=True</code> fails with "Missing key(s) … Unexpected key(s)". Save <code>model.module.state_dict()</code> (or the un-compiled model's), or strip the prefix when loading. Never fix it with <code>strict=False</code> without reading which keys were skipped: that silently leaves layers random.</p>` }
    ],
    deepDive: `<p><b>🟣 Checkpoint formats.</b> <code>torch.save</code> uses pickle plus a zip of tensor storages. <code>weights_only=True</code> restricts unpickling to tensors and primitive containers. safetensors stores raw tensors with a JSON header: safe to load and memory-mappable, so large models load fast. For multi-GPU training, <code>torch.distributed.checkpoint</code> (DCP) saves sharded state from FSDP without gathering it on one GPU. Save atomically (write to a temp file, then rename) so a crash during saving does not destroy your only checkpoint, and keep the last N plus the best.</p>
      <p><b>Fine-tuning pitfalls.</b> Use the pretrained model's exact preprocessing (normalisation statistics, tokenizer, max length). BatchNorm layers in a frozen backbone should usually stay in eval mode (keep their running stats) when your batches are small. Turn off weight decay on LayerNorm and biases. Evaluate the untouched pretrained model or a linear probe first as a baseline.</p>
      <p><b>Hugging Face details.</b> <code>from_pretrained</code> accepts <code>torch_dtype=torch.bfloat16</code> and <code>device_map='auto'</code> for large models; <code>save_pretrained</code> writes config + safetensors weights; <code>push_to_hub</code> publishes. <code>Trainer</code> handles gradient accumulation (<code>gradient_accumulation_steps</code>), checkpoint rotation (<code>save_total_limit</code>) and resuming (<code>resume_from_checkpoint</code>). In recent transformers versions the argument is <code>eval_strategy</code> (older code uses <code>evaluation_strategy</code>).</p>`,
    aiEra: `<p><b>🤖 Transfer learning is the default now.</b> Almost nobody trains vision or language models from scratch for a product: you start from a pretrained checkpoint (Hugging Face Hub, timm, torchvision) and fine-tune, or use PEFT/LoRA on a large model. Assistants can write a working <code>Trainer</code> script in a minute; your value is in choosing the checkpoint (licence, size, domain), the evaluation set and the learning rate, and in reading the warnings (newly initialised weights, truncated inputs, missing keys). Treat any checkpoint you download as untrusted code if it is a pickle: prefer safetensors and <code>weights_only=True</code>.</p>`,
    problems: [
      PR('freeze', {
        title: 'Trainable Parameters After Freezing the Backbone', level: 'Easy', tags: ['transfer learning', 'parameters', 'fine-tuning'], companies: ['Hugging Face', 'Google', 'Apple'],
        statement: `<p>A backbone is a chain of <code>nn.Linear</code> layers with biases, described by its sizes <code>dims</code>: <code>[768, 512, 256]</code> means Linear(768, 512) then Linear(512, 256). A new head <code>Linear(dims[-1], num_classes)</code> (with bias) is added. Write <code>finetune_param_counts(dims, num_classes, freeze_backbone)</code> that returns <code>[total_params, trainable_params]</code>, like <code>sum(p.numel() for p in model.parameters())</code> and the same with <code>if p.requires_grad</code>.</p>`,
        constraints: `<p>1 ≤ len(dims) ≤ 50; 1 ≤ dims[i], num_classes ≤ 10<sup>5</sup>. With a single size the backbone has no layers (it is just the feature size).</p>`,
        example: `<p><code>dims = [768, 512, 256], num_classes = 2, freeze = True</code> → <code class="c-g">[525570, 514]</code>. Backbone: (768·512 + 512) + (512·256 + 256) = 393,728 + 131,328 = 525,056. Head: 256·2 + 2 = 514. Total 525,570; only the head trains.</p>`,
        bruteWhy: `<p>Building the real model with random weights just to count parameters allocates every matrix (gigabytes for a big model). The counts only depend on the shapes, so arithmetic on the sizes is enough.</p>`,
        mcq: { q: `How many parameters does <code>nn.Linear(2048, 5)</code> have?`, options: ['10,245', '10,240', '2,053', '10,250'], answer: 0, explain: `2048 × 5 weights + 5 biases = 10,245.` },
        hints: [
          `Hint 1: A Linear(in, out) layer has an (out × in) weight matrix and out biases: in·out + out parameters.`,
          `Hint 2: Loop over consecutive pairs (dims[i], dims[i+1]) for the backbone, then add the head separately.`,
          `Hint 3: total = backbone + head in both cases. trainable = head if frozen, else total. One size means an empty backbone (0).`
        ],
        approach: `<p>Sum <code>in·out + out</code> over consecutive backbone sizes, compute the head the same way, and report the total together with either the head alone (frozen) or everything (full fine-tuning).</p>`,
        dry: { head: ['layer', 'in·out + out', 'running backbone'], rows: [['Linear(768, 512)', '393,216 + 512 = 393,728', '393,728'], ['Linear(512, 256)', '131,072 + 256 = 131,328', '525,056'], ['head Linear(256, 2)', '512 + 2 = 514', 'total 525,570, trainable 514']] },
        complexity: `<p>O(len(dims)) time, O(1) space.</p>`,
        followUps: ['How many trainable parameters would LoRA with rank r add to one Linear(d, d)? (2·d·r)', 'How much optimizer memory does freezing save with AdamW?']
      })
    ]
  });

  // ===================== TOPIC 8: DEBUGGING + REPRODUCIBILITY =====================
  topics.push({
    title: 'Debugging Training and Reproducibility',
    analogy: `<p>Debugging a training run is like being a <b>doctor reading a patient's chart</b>. The loss curves are the temperature chart: a fever that keeps rising (diverging), a patient who never responds to medicine (not learning), or one who looks great at home but collapses outside (overfitting). Each pattern points to a different cause. Reproducibility is the doctor writing down <b>exactly</b> what was given and when, so another doctor can repeat the treatment and see the same result.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Neural networks fail <i>silently</i>: buggy code usually still runs and the loss still goes down a bit. So debug with a checklist and with the curves.</p>
      <h4>Read the curves</h4>
      ${H.table(['symptom', 'likely causes', 'first things to try'], [
        ['<span class="c-r">loss goes up / NaN</span> (diverging)', 'lr too high, no warm-up, fp16 overflow, log(0) or division by ~0, bad batch', 'lower lr, warm-up, gradient clipping, bf16, losses from logits, check data'],
        ['<span class="c-y">loss flat</span> near the start value (e.g. ln C)', 'bug: forgot zero_grad/step, frozen params, detached graph, wrong labels, lr far too small, dead ReLUs', 'overfit ONE batch; check grads are non-zero; print a batch'],
        ['<span class="c-p">train ↓, val ↑</span> (overfitting)', 'too little data, too big a model, too many epochs', 'augmentation, dropout, weight decay, early stopping, more data'],
        ['<span class="c-b">both high</span> and falling slowly (underfitting)', 'model too small, lr too small, too few epochs, too much regularisation', 'bigger model, train longer, tune lr, reduce dropout/decay'],
        ['val better than train', 'dropout/augmentation only in training, or val is easier', 'often fine; compare train loss measured in eval mode']
      ])}
      <h4>The debugging checklist</h4>
      <ol>
        <li><b>Look at the data</b> after the DataLoader: shapes, dtypes, value ranges, a few decoded examples with their labels.</li>
        <li><b>Check the initial loss</b>: about ln(C) for C balanced classes.</li>
        <li><b>Overfit a single batch</b>: with dropout and decay off, the loss on one batch of 2–8 examples should go to near 0. If not, it is a bug, not a hyperparameter.</li>
        <li><b>Watch the gradient norm</b> and the lr every step; spikes come before NaNs.</li>
        <li><b>Clip gradients</b> (<code>clip_grad_norm_(params, 1.0)</code>) to survive occasional spikes.</li>
        <li><b>Find the first NaN</b>: <code>torch.isfinite(loss)</code> checks, then <code>torch.autograd.set_detect_anomaly(True)</code> to name the op.</li>
        <li><b>Change one thing at a time</b>, and compare against a simple baseline.</li>
      </ol>
      <h4>Reproducibility</h4>
      <p>Seed every random number generator, seed DataLoader workers and its shuffling generator, and, if you need bit-exact results on GPU, ask for deterministic algorithms (slower). Log the code version, config, data version and library versions with every run. Even then, results are only guaranteed identical on the same hardware and software versions.</p>`,
    clues: [
      '"Loss is NaN after a few hundred steps" → lr/warm-up, fp16 overflow, log(0), bad data: log grad norms and find the first non-finite value',
      '"My loss is not decreasing at all" → overfit one batch, check zero_grad/step, requires_grad, labels, lr',
      '"Two runs with the same seed give different results" → unseeded workers, cudnn.benchmark, non-deterministic GPU kernels, different hardware',
      '"Validation loss rises while training loss falls" → overfitting: regularise, early stop',
      '"Loss decreases but accuracy is stuck" → check the metric code, class imbalance (always predicting the majority class)',
      'Interviewer: "How would you debug a model that is not learning?" → data, initial loss, overfit one batch, gradients, then hyperparameters'
    ],
    code: [
      { lang: 'python', title: 'Seeding and determinism in PyTorch 2.x (shown, not run here)', code: `import os, random
import numpy as np
import torch

def seed_everything(seed: int, deterministic: bool = False):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)                    # CPU and all CUDA devices
    if deterministic:
        os.environ['CUBLAS_WORKSPACE_CONFIG'] = ':4096:8'   # needed by some cuBLAS ops
        torch.use_deterministic_algorithms(True)            # error on non-deterministic ops
        torch.backends.cudnn.benchmark = False              # no autotuned (varying) kernels

def seed_worker(worker_id):                    # each DataLoader worker gets its own seed
    worker_seed = torch.initial_seed() % 2**32
    np.random.seed(worker_seed)
    random.seed(worker_seed)

seed_everything(42)
g = torch.Generator().manual_seed(42)
loader = torch.utils.data.DataLoader(train_ds, batch_size=32, shuffle=True, num_workers=4,
                                     worker_init_fn=seed_worker, generator=g)
` },
      { lang: 'python', title: 'Debugging helpers (shown, not run here)', code: `import torch

# 1) overfit one batch: should reach ~0 loss in a few hundred steps
xb, yb = next(iter(train_dl))
model.train()
for step in range(300):
    optimizer.zero_grad(set_to_none=True)
    loss = loss_fn(model(xb), yb)
    loss.backward()
    optimizer.step()
print('one-batch loss', loss.item())

# 2) every trainable parameter should get a gradient
loss_fn(model(xb), yb).backward()
for name, p in model.named_parameters():
    if p.requires_grad and (p.grad is None or p.grad.abs().sum() == 0):
        print('no gradient for', name)

# 3) log the gradient norm and stop on the first non-finite loss
for xb, yb in train_dl:
    optimizer.zero_grad(set_to_none=True)
    loss = loss_fn(model(xb), yb)
    if not torch.isfinite(loss):
        raise RuntimeError(f'non-finite loss: {loss.item()}')
    loss.backward()
    grad_norm = torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)  # returns the norm BEFORE clipping
    optimizer.step()

# 4) name the op that produced a NaN in backward (slow: debugging only)
with torch.autograd.detect_anomaly():
    loss_fn(model(xb), yb).backward()
` }
    ],
    codeTitle: ['Reproducibility', 'Debugging'],
    viz: {
      title: 'Diagnosing a run from its loss curves',
      input: '2.0 1.2 0.8 0.5 0.3 0.15 | 2.0 1.3 1.0 1.0 1.15 1.3',
      inputLabel: 'train losses per epoch | validation losses per epoch (same count, ≤ 12)',
      gen: function (input) {
        var p = splitBar(input, 2, 'train losses | val losses');
        var tr = nums(p[0], 'train losses', 12), va = nums(p[1], 'validation losses', 12), F = [];
        if (tr.length !== va.length || tr.length < 2) throw new Error('Give the same number (at least 2) of train and validation losses');
        var f = tr[0], l = tr[tr.length - 1];
        F.push({ narr: 'Two curves, one per epoch. Read them in order: is the training loss moving at all? In the right direction? Does validation follow it?', parts: [{ type: 'bars', label: 'train loss', values: tr }, { type: 'bars', label: 'validation loss', values: va }] });
        var verdict;
        F.push({ narr: 'Check 1, <b>diverging?</b> Last train loss ' + l + ' vs first ' + f + '. ' + (l > 1.5 * f ? '<span class="c-r">It grew by more than 50%: diverging.</span> Lower the lr, add warm-up and gradient clipping, check for fp16 overflow and bad batches.' : 'No: it did not blow up.'), parts: [{ type: 'bars', label: 'train loss', values: tr, hl: one(tr.length - 1, l > 1.5 * f ? 'bad' : 'ok') }] });
        if (l > 1.5 * f) verdict = 'diverging';
        if (!verdict) {
          F.push({ narr: 'Check 2, <b>learning at all?</b> ' + (l > 0.95 * f ? '<span class="c-y">Train loss fell by less than 5%: not learning.</span> Overfit one batch, check zero_grad/step, frozen parameters, labels and the lr.' : 'Yes: train loss fell by ' + r4(100 * (1 - l / f)) + '%.'), parts: [{ type: 'bars', label: 'train loss', values: tr, hl: one(0, 'cur') }] });
          if (l > 0.95 * f) verdict = 'not learning';
        }
        if (!verdict) {
          var m = 0; va.forEach(function (x, i) { if (x < va[m]) m = i; });
          var over = m < va.length - 1 && va[va.length - 1] > 1.1 * va[m];
          var h = {}; h[m] = 'sel'; h[va.length - 1] = over ? 'bad' : 'ok';
          F.push({ narr: 'Check 3, <b>overfitting?</b> Best validation loss ' + va[m] + ' at epoch ' + m + '; last ' + va[va.length - 1] + '. ' + (over ? '<span class="c-p">Validation rose more than 10% above its best while training kept falling: overfitting.</span> Early stopping would have kept epoch ' + m + '.' : 'No: validation is still near its best.'), parts: [{ type: 'bars', label: 'validation loss', values: va, hl: h }] });
          if (over) verdict = 'overfitting';
        }
        F.push({ narr: 'Verdict: <b>' + (verdict || 'learning normally: compare the final loss with your target to decide between underfitting and healthy') + '</b>. Change one thing, re-run with the same seed, and compare the curves.', parts: [{ type: 'text', label: 'diagnosis', html: verdict || 'healthy or underfitting' }] });
        return F;
      }
    },
    examples: [
      { title: 'Overfitting one batch catches real bugs', html: `<p>A classifier's loss stays at 2.30 even on one batch of 4 images. Gradients are zero for every layer. Cause: the forward pass returned <code>logits.argmax(1).float()</code> (no gradient path). On a single batch the problem is obvious in a minute instead of after a day of training.</p>` },
      { title: 'Gradient clipping by global norm', html: `<p>Gradients [3, 4] have norm 5. With max_norm 1 every entry is multiplied by 1/5: [0.6, 0.8]. The <b>direction</b> is unchanged, only the length shrinks. With max_norm 10 nothing changes. <code>clip_grad_norm_</code> returns the norm before clipping, which is the number worth logging.</p>` },
      { title: 'Same seed, different results', html: `<p>Two GPU runs with <code>torch.manual_seed(0)</code> differ after a few hundred steps. Atomic adds in some CUDA kernels (scatter, index_add, some backward passes) sum in a different order each run, and floating-point addition is not associative. <code>torch.use_deterministic_algorithms(True)</code> either picks a deterministic version or raises an error naming the op. Small run-to-run differences are normal; report results as a mean over several seeds.</p>` }
    ],
    deepDive: `<p><b>🟣 Where NaNs come from.</b> <code>log(0)</code> (use <code>log_softmax</code>/<code>BCEWithLogitsLoss</code>, not log of a softmax), <code>sqrt(0)</code> in backward (infinite slope; add an epsilon), division by a norm that can be 0, <code>exp</code> of large values, fp16 overflow above 65,504, and 0 × inf in masking (use <code>masked_fill</code> with a large negative number rather than multiplying by 0 after an inf). One NaN in a weight spreads to everything within one step.</p>
      <p><b>Silent bugs worth checking.</b> Labels shuffled separately from inputs; normalisation computed on the whole dataset including test; data leakage between train and validation (same users or near-duplicates); <code>view</code> mixing up batch and time dims; padding tokens counted in the loss or the metric; class imbalance making accuracy meaningless (look at a confusion matrix or per-class F1).</p>
      <p><b>Reproducibility layers.</b> Python, NumPy and torch RNGs; the DataLoader generator and per-worker seeds; cuDNN autotuning (<code>benchmark=True</code> picks kernels by timing, which can vary); non-deterministic kernels; and the environment itself (driver, CUDA, PyTorch versions, number of GPUs). For resuming, also restore the RNG states and the sampler position. Tools such as Weights &amp; Biases, MLflow or TensorBoard record configs, curves and gradients so runs can be compared.</p>`,
    aiEra: `<p><b>🤖 Debugging with assistants.</b> Paste the full error, the shapes, and the curves (numbers, not a screenshot description) into the assistant. It is very good at mapping an error message to a cause, and at suggesting the standard checklist. It is less good at bugs that leave no error: those need your experiments (overfit one batch, ablate one change, compare with a known-good baseline). Ask it to add assertions and logging rather than to "fix" blindly, and keep a seeded, reproducible setup so you can tell whether its change actually helped or you just got a lucky seed.</p>`,
    problems: [
      PR('diag', {
        title: 'Diagnose a Training Run', level: 'Medium', tags: ['debugging', 'overfitting', 'training curves'], companies: ['OpenAI', 'Anthropic', 'Google DeepMind'],
        statement: `<p>Given per-epoch <code>train</code> and <code>val</code> losses (same length ≥ 2) and a <code>target</code> train loss, write <code>diagnose_run(train, val, target)</code> returning the first label that applies:</p>
          <ol><li><code>"diverging"</code> if the last train loss &gt; 1.5 × the first;</li>
          <li><code>"not_learning"</code> if the last train loss &gt; 0.95 × the first;</li>
          <li><code>"overfitting"</code> if the lowest validation loss (first epoch where it occurs) is not the last epoch <b>and</b> the last validation loss &gt; 1.1 × that lowest value;</li>
          <li><code>"underfitting"</code> if the last train loss &gt; target;</li>
          <li>otherwise <code>"healthy"</code>.</li></ol>`,
        constraints: `<p>2 ≤ len(train) = len(val) ≤ 10<sup>5</sup>; all losses &gt; 0.</p>`,
        example: `<p><code>train = [2, 1, 0.5, 0.1]</code>, <code>val = [2, 1.2, 1.0, 1.3]</code>, <code>target = 0.2</code> → <code class="c-p">"overfitting"</code>: train fell by 95%, best val 1.0 at epoch 2, and 1.3 &gt; 1.1.</p>
          <p>Same with <code>val = [2, 1.2, 1.0, 1.05]</code> → <code class="c-g">"healthy"</code>: 1.05 is within 10% of the best, and 0.1 ≤ 0.2.</p>`,
        bruteWhy: `<p>Looking only at the final validation loss misses every pattern: a diverged run, a run that never learned and an overfitted one can all end with the same number. The ORDER of checks matters too: a diverging run also "has val rising", but the fix is completely different.</p>`,
        mcq: { q: `Training loss is stuck at 2.30 for a 10-class problem from the first step. What is the best first experiment?`, options: ['Try to overfit a single small batch', 'Train for 10× more epochs', 'Add more dropout', 'Collect more data'], answer: 0, explain: `ln 10 ≈ 2.30 means uniform predictions: the model is not learning at all. If it cannot fit 4 examples, there is a bug (gradients, labels, optimizer wiring), and more epochs, data or regularisation will not help.` },
        hints: [
          `Hint 1: Implement the checks in the given order and return as soon as one matches. The ratios compare the last train loss with the first.`,
          `Hint 2: For overfitting, find the index of the minimum validation loss (the first one if tied) and compare the last value with 1.1 × that minimum.`,
          `Hint 3: If the minimum IS the last epoch, it cannot be overfitting yet. Only after these three checks compare the last train loss with the target.`
        ],
        approach: `<p>Compute the first and last training losses for the divergence and no-progress checks, then the argmin of the validation curve for the overfitting check, then compare with the target. Each check maps to a different fix, which is the point of diagnosing in a fixed order.</p>`,
        dry: { head: ['check', 'values', 'result'], rows: [['diverging?', '0.1 > 1.5·2 = 3?', 'no'], ['not learning?', '0.1 > 0.95·2 = 1.9?', 'no'], ['overfitting?', 'best val 1.0 at epoch 2; 1.3 > 1.1?', '<span class="c-p">yes → "overfitting"</span>']] },
        complexity: `<p>O(E) for E epochs (one pass to find the minimum), O(1) extra space.</p>`,
        followUps: ['What would you add to detect "loss is NaN"?', 'How would you make the thresholds robust to noisy validation curves (smoothing, min_delta)?']
      })
    ]
  });

  // ===================== PRACTICE ARENA =====================
  practice.push(PR('dropout', {
    title: 'Inverted Dropout, Train vs Eval', level: 'Easy', tags: ['dropout', 'train vs eval', 'regularisation'], companies: ['Google', 'Apple'],
    statement: `<p>Implement the forward pass of <code>nn.Dropout(p)</code> with a given keep-mask. Write <code>dropout_forward(x, mask, p, training)</code>: in training mode, element i is <code>x[i] / (1 − p)</code> if <code>mask[i] == 1</code> and 0 otherwise; in eval mode the input is returned unchanged.</p>`,
    constraints: `<p>0 ≤ len(x) = len(mask) ≤ 10<sup>5</sup>; 0 ≤ p &lt; 1; mask values are 0 or 1.</p>`,
    example: `<p><code>x = [1, 2, 3, 4], mask = [1, 0, 1, 0], p = 0.5, training = True</code> → <code class="c-g">[2, 0, 6, 0]</code>. With <code>training = False</code> → <code class="c-g">[1, 2, 3, 4]</code>.</p>`,
    bruteWhy: `<p>"Classic" dropout does not scale during training and instead multiplies by (1 − p) at inference. It is equivalent in expectation but every inference path must remember to rescale; inverted dropout puts the work in training so <code>eval()</code> is a no-op.</p>`,
    mcq: { q: `Why are kept activations divided by (1 − p) during training?`, options: ['To keep each activation\'s expected value the same as in eval mode', 'To make the gradients larger', 'To normalise the layer to unit variance', 'To make dropout deterministic'], answer: 0, explain: `E[output] = (1 − p) · x / (1 − p) = x, so the next layer sees the same scale in training and inference.` },
    hints: [
      `Hint 1: Handle eval mode first: return a copy of x.`,
      `Hint 2: In training, each element is either dropped (0) or kept and scaled by 1/(1 − p).`,
      `Hint 3: zip x with mask in a list comprehension. An empty input gives an empty output.`
    ],
    approach: `<p>If not training, return x unchanged. Otherwise multiply each element by mask[i] / (1 − p). This is exactly <code>F.dropout</code>, where PyTorch draws the mask from a Bernoulli(1 − p) distribution on every call.</p>`,
    complexity: `<p>O(n) time and space.</p>`,
    followUps: ['Why does a model give different predictions on each call if you forget model.eval()?', 'What is MC dropout and why would you keep dropout on at inference on purpose?']
  }));

  practice.push(PR('steplr', {
    title: 'StepLR Learning Rate at an Epoch', level: 'Easy', tags: ['learning rate', 'schedulers'], companies: ['Amazon', 'Meta'],
    statement: `<p>Write <code>step_lr(base_lr, step_size, gamma, epoch)</code> returning the learning rate that <code>torch.optim.lr_scheduler.StepLR</code> gives at a 0-based epoch: the lr is multiplied by <code>gamma</code> every <code>step_size</code> epochs.</p>`,
    constraints: `<p>0 ≤ epoch ≤ 10<sup>6</sup>; 1 ≤ step_size; 0 &lt; gamma ≤ 1. Compared with a relative tolerance of 1e-5.</p>`,
    example: `<p><code>base_lr = 0.1, step_size = 30, gamma = 0.1</code>: epoch 29 → <code class="c-g">0.1</code>, epoch 30 → <code class="c-g">0.01</code>, epoch 95 → <code class="c-g">0.0001</code> (three drops).</p>`,
    bruteWhy: `<p>Simulating the scheduler epoch by epoch gives the same answer but costs O(epoch) per query. The closed form gamma<sup>⌊epoch / step_size⌋</sup> is O(1); PyTorch's <code>get_last_lr()</code> reports the same thing.</p>`,
    mcq: { q: `StepLR(step_size=10, gamma=0.5) with base lr 0.2: what is the lr at epoch 25?`, options: ['0.05', '0.1', '0.025', '0.2'], answer: 0, explain: `⌊25 / 10⌋ = 2 drops: 0.2 × 0.5² = 0.05.` },
    hints: [
      `Hint 1: Count how many full step_size blocks have passed: epoch // step_size.`,
      `Hint 2: Each completed block multiplies the lr by gamma once.`,
      `Hint 3: Return base_lr * gamma ** (epoch // step_size). gamma = 1 means a constant lr.`
    ],
    approach: `<p>Closed form: number of decays = <code>epoch // step_size</code>, so lr = base · gamma<sup>decays</sup>.</p>`,
    complexity: `<p>O(1) (or O(log epoch) for the power).</p>`,
    followUps: ['How does MultiStepLR(milestones=[30, 80]) differ?', 'If you step this scheduler every batch instead of every epoch, what happens?']
  }));

  practice.push(PR('acc', {
    title: 'Accuracy From Logits', level: 'Easy', tags: ['metrics', 'evaluation', 'argmax'], companies: ['Microsoft', 'Uber'],
    statement: `<p>Write <code>accuracy(logits, labels)</code>: <code>logits</code> is an N × C list of raw scores, <code>labels</code> holds N class ids. The prediction is the argmax of each row (the <b>first</b> index if there is a tie, like <code>torch.argmax</code>). Return the fraction predicted correctly.</p>`,
    constraints: `<p>1 ≤ N ≤ 10<sup>5</sup>; 1 ≤ C ≤ 1000.</p>`,
    example: `<p><code>logits = [[2, 1], [0, 3]]</code>, <code>labels = [0, 1]</code> → <code class="c-g">1.0</code>. <code>logits = [[1, 1, 1]]</code>, <code>labels = [2]</code> → <code class="c-r">0.0</code>: a tie picks index 0.</p>`,
    bruteWhy: `<p>Applying softmax first and then taking the argmax gives the same predictions, because softmax is monotonic, but it wastes an exp per entry and can overflow with large logits. Argmax works on the raw logits.</p>`,
    mcq: { q: `Does applying softmax before argmax change the predicted class?`, options: ['No, softmax preserves the order of the scores', 'Yes, it can change the top class', 'Only for binary problems', 'Only when logits are negative'], answer: 0, explain: `Softmax is strictly increasing in each logit (for a fixed row), so the largest logit stays the largest probability.` },
    hints: [
      `Hint 1: For each row, find the index of the largest value; use a strict > so ties keep the first index.`,
      `Hint 2: Compare that index with the label and count matches.`,
      `Hint 3: Divide the count by N. In PyTorch: (logits.argmax(dim=1) == labels).float().mean().`
    ],
    approach: `<p>Loop over the rows, compute the argmax with a strict comparison, count matches and divide by N.</p>`,
    complexity: `<p>O(N·C) time, O(1) extra space.</p>`,
    followUps: ['Why is accuracy misleading with 99% of examples in one class?', 'How would you compute top-5 accuracy?']
  }));

  practice.push(PR('steps', {
    title: 'How Many Optimizer Steps?', level: 'Easy', tags: ['DataLoader', 'gradient accumulation', 'schedulers'], companies: ['Hugging Face', 'Databricks'],
    statement: `<p>Schedulers that step per update need the total number of optimizer steps. Write <code>optimizer_steps(n, batch_size, accum_steps, epochs, drop_last)</code>. Each epoch has ⌈n / batch_size⌉ batches (⌊n / batch_size⌋ with drop_last). With gradient accumulation, the optimizer steps once every <code>accum_steps</code> batches, and also once at the end of the epoch if a partial group is left. Return the total over all epochs.</p>`,
    constraints: `<p>0 ≤ n ≤ 10<sup>9</sup>; 1 ≤ batch_size, accum_steps; 0 ≤ epochs ≤ 1000.</p>`,
    example: `<p><code>n = 1000, batch_size = 32, accum = 4, epochs = 3</code>: 32 batches per epoch → ⌈32 / 4⌉ = 8 steps → <code class="c-g">24</code>. With drop_last: 31 batches → still 8 steps per epoch → 24.</p>`,
    bruteWhy: `<p>Simulating every batch and counting works but is O(n / batch_size · epochs). Integer ceiling division gives the answer instantly. Using the wrong count (for example, forgetting accumulation) makes a cosine schedule end far too early or never reach its minimum.</p>`,
    mcq: { q: `Gradient accumulation with micro-batch 8 and accum_steps 4 behaves most like...`, options: ['A batch of 32 with one optimizer step', 'Four separate optimizer steps on batches of 8', 'A batch of 8 with a 4× learning rate', 'A batch of 2'], answer: 0, explain: `Gradients from 4 micro-batches add up in .grad (each loss divided by 4), then one step is taken: the same update as one batch of 32 (except for BatchNorm statistics).` },
    hints: [
      `Hint 1: Ceiling division without floats: (a + b − 1) // b.`,
      `Hint 2: First compute the batches per epoch, then the optimizer steps per epoch from that.`,
      `Hint 3: Multiply by epochs. Zero batches give zero steps.`
    ],
    approach: `<p>batches = n // bs if drop_last else ceil(n / bs); steps per epoch = ceil(batches / accum); total = steps per epoch × epochs.</p>`,
    complexity: `<p>O(1) time and space: two integer divisions and a multiplication.</p>`,
    followUps: ['Hugging Face Trainer computes max_steps this way. Where does num_processes (GPUs) enter the formula?', 'Why should warm-up be specified in optimizer steps, not batches?']
  }));

  practice.push(PR('clip', {
    title: 'Gradient Clipping by Global Norm', level: 'Medium', tags: ['gradient clipping', 'debugging', 'stability'], companies: ['OpenAI', 'NVIDIA'],
    statement: `<p>Implement <code>torch.nn.utils.clip_grad_norm_</code> for a flat list of gradients. Compute the global L2 norm <code>total = √(Σ g²)</code>, then <code>coef = max_norm / (total + 1e-6)</code>; if coef &lt; 1, multiply every gradient by coef, otherwise leave them unchanged. Write <code>clip_grad_norm(grads, max_norm)</code> returning the new gradients.</p>`,
    constraints: `<p>1 ≤ len(grads) ≤ 10<sup>6</sup>; max_norm &gt; 0. Compared with a relative tolerance of 1e-5.</p>`,
    example: `<p><code>grads = [3, 4], max_norm = 1</code>: norm 5, coef ≈ 0.2 → <code class="c-g">[0.6, 0.8]</code> (direction unchanged). <code>max_norm = 10</code> → <code class="c-g">[3, 4]</code> (no change).</p>`,
    bruteWhy: `<p>Clipping each value into [−max, max] (<code>clip_grad_value_</code>) is a different method: it changes the gradient's direction, e.g. [3, 4] with limit 1 becomes [1, 1]. Norm clipping keeps the direction and only shortens the step, which is why it is the standard for transformers.</p>`,
    mcq: { q: `When must you call <code>scaler.unscale_(optimizer)</code> in fp16 training?`, options: ['Before clip_grad_norm_, so the norm is computed on real gradients', 'After optimizer.step()', 'Before the forward pass', 'Never; clipping works on scaled gradients'], answer: 0, explain: `Scaled gradients are 65,536× too large, so clipping them to 1.0 would be meaningless. Unscale first, then clip, then scaler.step.` },
    hints: [
      `Hint 1: The norm is over ALL gradients together (one number), not per element.`,
      `Hint 2: coef = max_norm / (norm + 1e-6), then clamp coef to at most 1.`,
      `Hint 3: Multiply every gradient by coef. All-zero gradients give coef > 1 → clamp to 1 → unchanged.`
    ],
    approach: `<p>One pass to compute the global norm, then scale every gradient by min(1, max_norm / (norm + 1e-6)). This preserves the direction and caps the update length; PyTorch also returns the pre-clipping norm, which is the best signal to log for spotting instabilities.</p>`,
    complexity: `<p>O(n) time, O(n) for the output.</p>`,
    followUps: ['Why do spikes in the gradient norm often come before loss spikes?', 'Is clipping a fix for a too-high learning rate? What does it hide?']
  }));

  practice.push(PR('cosrestart', {
    title: 'Cosine Annealing With Warm Restarts', level: 'Medium', tags: ['learning rate', 'schedulers', 'SGDR'], companies: ['Meta', 'Samsung'],
    statement: `<p>Write <code>cosine_warm_restarts(base_lr, eta_min, t0, t_mult, epoch)</code> returning the lr of <code>CosineAnnealingWarmRestarts</code> at an integer epoch. The first cycle lasts <code>t0</code> epochs and each next cycle is <code>t_mult</code> times longer. Inside a cycle of length T<sub>i</sub>, at position T<sub>cur</sub> (0-based):</p>
      <p>lr = eta_min + (base_lr − eta_min) · (1 + cos(π · T<sub>cur</sub> / T<sub>i</sub>)) / 2</p>`,
    constraints: `<p>0 ≤ epoch ≤ 10<sup>6</sup>; 1 ≤ t0; t_mult ≥ 1 (integer); 0 ≤ eta_min ≤ base_lr.</p>`,
    example: `<p><code>base 0.1, eta_min 0, t0 10, t_mult 1</code>: epoch 5 → <code class="c-g">0.05</code> (half-way down); epoch 10 → <code class="c-g">0.1</code> (restart).</p>
      <p><code>base 0.1, eta_min 0.001, t0 10, t_mult 2, epoch 15</code>: cycles are 10, 20, … so epoch 15 is position 5 of a 20-epoch cycle → 0.001 + 0.099 · (1 + cos(π/4)) / 2 ≈ <code class="c-g">0.0855</code>.</p>`,
    bruteWhy: `<p>Stepping a simulated scheduler one epoch at a time is fine for small epochs; the loop below jumps a whole cycle at a time instead. Getting the cycle boundaries wrong by one (restarting at epoch 9 instead of 10) is the classic bug.</p>`,
    mcq: { q: `What is the point of a warm restart?`, options: ['A sudden lr increase can move the model out of a sharp minimum and explore again', 'It resets the weights to their initial values', 'It clears the optimizer state', 'It reduces memory usage'], answer: 0, explain: `SGDR (Loshchilov &amp; Hutter) raises the lr back to the base at each restart; weights and optimizer state are kept. Snapshots at the end of each cycle can also be ensembled.` },
    hints: [
      `Hint 1: Find the cycle first: start with T_i = t0 and T_cur = epoch, and while T_cur ≥ T_i subtract T_i and multiply T_i by t_mult.`,
      `Hint 2: Then apply the cosine formula with T_cur / T_i between 0 (start) and just under 1 (end).`,
      `Hint 3: With t_mult = 1 every cycle has length t0, so T_cur = epoch % t0. Use math.cos and math.pi.`
    ],
    approach: `<p>Peel off whole cycles (each t_mult times longer than the last) until the remaining epoch falls inside the current cycle, then evaluate the cosine between base_lr and eta_min at that position.</p>`,
    complexity: `<p>O(log epoch) cycles when t_mult ≥ 2, O(epoch / t0) when t_mult = 1 (use a modulo for O(1)).</p>`,
    followUps: ['How would you add a linear warm-up before the first cycle?', 'Why do many LLM recipes use one long cosine (or warm-up–stable–decay) instead of restarts?']
  }));

  practice.push(PR('ce', {
    title: 'CrossEntropyLoss With ignore_index and Label Smoothing', level: 'Medium', tags: ['loss functions', 'cross-entropy', 'label smoothing'], companies: ['Anthropic', 'Google', 'OpenAI'],
    statement: `<p>Implement <code>nn.CrossEntropyLoss(ignore_index=..., label_smoothing=ε)</code> with mean reduction. Write <code>cross_entropy(logits, targets, ignore_index, label_smoothing)</code>. For each row whose target is not <code>ignore_index</code>, with log-probabilities <code>logp = log_softmax(row)</code> over C classes:</p>
      <p>loss<sub>i</sub> = (1 − ε) · (−logp[target]) + ε · (−Σ<sub>k</sub> logp[k]) / C</p>
      <p>Return the mean over the non-ignored rows (0.0 if every row is ignored).</p>`,
    constraints: `<p>1 ≤ N ≤ 10<sup>4</sup>, 2 ≤ C ≤ 1000; |logit| ≤ 10<sup>4</sup> (must not overflow); 0 ≤ ε &lt; 1.</p>`,
    example: `<p><code>[[0, 0]]</code>, target 0 → <code class="c-g">ln 2 ≈ 0.6931</code>. <code>[[1000, 0]]</code>, target 1 → <code class="c-g">1000</code> (needs the log-sum-exp trick). Rows with target −100 are skipped and not counted in the mean.</p>`,
    bruteWhy: `<p>Computing softmax with <code>math.exp(z)</code> directly overflows for logits around 710 and above, and <code>log</code> of a probability that rounded to 0 is −inf. Subtracting the row max first (log-sum-exp) is exactly what <code>F.log_softmax</code> does internally.</p>`,
    mcq: { q: `In language-model fine-tuning, why are prompt and padding positions set to −100 in the labels?`, options: ['CrossEntropyLoss ignores them by default, so only answer tokens contribute to the loss and the mean', 'To make those tokens more likely', 'Because −100 is the padding token id', 'To speed up the softmax'], answer: 0, explain: `ignore_index defaults to −100; ignored positions add nothing and are excluded from the average.` },
    hints: [
      `Hint 1: Stable log_softmax: m = max(row); lse = m + log(Σ exp(z − m)); logp = z − lse.`,
      `Hint 2: The smoothing term is the average of −logp over all C classes (cross-entropy against a uniform distribution).`,
      `Hint 3: Skip rows with target == ignore_index entirely, and divide by the number of rows you kept, not N. Return 0.0 if none are kept.`
    ],
    approach: `<p>For each kept row compute a numerically stable log-softmax, then blend the usual negative log-likelihood with the uniform-target term using ε, and average over kept rows. This matches PyTorch's formula for label smoothing without class weights.</p>`,
    complexity: `<p>O(N·C) time, O(C) extra space per row.</p>`,
    followUps: ['How do class weights change the mean reduction?', 'Why does label smoothing make models less over-confident, and what does it do to calibration?']
  }));

  practice.push(PR('plateau', {
    title: 'ReduceLROnPlateau', level: 'Medium', tags: ['learning rate', 'schedulers', 'validation'], companies: ['Amazon', 'Tesla'],
    statement: `<p>Simulate <code>ReduceLROnPlateau(mode='min', factor, patience, threshold=0, cooldown=0, min_lr)</code>. Write <code>reduce_on_plateau(val_losses, lr, factor, patience, min_lr)</code>; the scheduler sees one validation loss per epoch:</p>
      <ul><li>The best starts at +∞. A loss strictly below the best is an improvement: update the best and reset the bad-epoch counter to 0.</li>
      <li>Otherwise add 1 to the counter. When it becomes <b>greater than</b> patience, set lr = max(lr · factor, min_lr) and reset the counter to 0.</li></ul>
      <p>Return the final lr.</p>`,
    constraints: `<p>1 ≤ len(val_losses) ≤ 10<sup>5</sup>; 0 &lt; factor &lt; 1; patience ≥ 0.</p>`,
    example: `<p><code>[1, 1, 1, 1]</code>, lr 0.1, factor 0.1, patience 2 → <code class="c-g">0.01</code>: epoch 0 sets the best; epochs 1, 2, 3 are bad; at the third bad epoch 3 &gt; 2, so the lr drops once.</p>`,
    bruteWhy: `<p>Cutting the lr at the first bad epoch reacts to noise and shrinks the lr far too early. Waiting until the counter exceeds patience is what makes this scheduler robust; remember it needs <code>scheduler.step(val_loss)</code>, unlike the others.</p>`,
    mcq: { q: `What do you pass to <code>ReduceLROnPlateau.step()</code>?`, options: ['The monitored metric, e.g. the validation loss', 'Nothing', 'The epoch number', 'The optimizer'], answer: 0, explain: `It reacts to a metric, so you call scheduler.step(val_loss) once per evaluation.` },
    hints: [
      `Hint 1: Keep best (start at infinity) and a bad-epoch counter.`,
      `Hint 2: "Greater than patience", not "equal to": with patience 2 the lr drops on the third bad epoch in a row.`,
      `Hint 3: After a drop, reset the counter to 0 (so another patience + 1 bad epochs are needed). Clamp with min_lr.`
    ],
    approach: `<p>Track the best metric and the number of consecutive non-improving epochs; once that number exceeds patience, multiply the lr by factor (not below min_lr) and reset the counter.</p>`,
    complexity: `<p>O(E) time, O(1) space.</p>`,
    followUps: ['What does PyTorch\'s default threshold=1e-4 in "rel" mode change?', 'Why combine this with early stopping, and which patience should be larger?']
  }));

  practice.push(PR('bn', {
    title: 'BatchNorm Running Statistics', level: 'Medium', tags: ['BatchNorm', 'train vs eval', 'buffers'], companies: ['Google', 'Qualcomm'],
    statement: `<p>In train mode, <code>nn.BatchNorm1d</code> (momentum m) updates two buffers after each batch: <code>running_mean = (1 − m)·running_mean + m·batch_mean</code> and <code>running_var = (1 − m)·running_var + m·batch_var</code>, where batch_var is the <b>unbiased</b> variance (divide by n − 1). They start at 0 and 1. In eval mode these running values replace the batch statistics.</p>
      <p>Write <code>batchnorm_running_stats(batches, momentum)</code> for one feature, returning <code>[running_mean, running_var]</code> after all batches.</p>`,
    constraints: `<p>0 ≤ len(batches) ≤ 10<sup>4</sup>; each batch has at least 2 values; 0 &lt; momentum ≤ 1.</p>`,
    example: `<p><code>batches = [[1, 3]], momentum = 0.1</code>: mean 2, unbiased var 2 → <code class="c-g">[0.2, 1.1]</code>. No batches → <code class="c-g">[0, 1]</code>.</p>`,
    bruteWhy: `<p>Storing every batch and averaging at the end needs memory for the whole history and gives equal weight to early batches, from when the model was very different. The exponential moving average needs two numbers and favours recent batches.</p>`,
    mcq: { q: `Why can a model with BatchNorm give bad predictions when evaluated in train mode with batch size 1?`, options: ['It normalises with the statistics of that single example instead of the running averages', 'Dropout is turned off', 'Gradients are not computed', 'The weights are frozen'], answer: 0, explain: `With one example the batch mean is the example itself, so features collapse to near 0 (and the variance is undefined). model.eval() switches to the running statistics.` },
    hints: [
      `Hint 1: Start with running_mean = 0.0 and running_var = 1.0.`,
      `Hint 2: For each batch compute the mean and the variance with n − 1 in the denominator.`,
      `Hint 3: Blend: new = (1 − m)·old + m·batch, for both statistics, batch by batch in order.`
    ],
    approach: `<p>Iterate over the batches, compute each batch's mean and unbiased variance, and update both exponential moving averages with the momentum, exactly like the BatchNorm buffers that get saved in the state_dict.</p>`,
    complexity: `<p>O(total values) time, O(1) extra space.</p>`,
    followUps: ['Why is LayerNorm preferred in transformers?', 'What does momentum=None (a cumulative average) change?']
  }));

  practice.push(PR('accum', {
    title: 'Gradient Accumulation Equals a Bigger Batch', level: 'Hard', tags: ['gradient accumulation', 'training loop', 'linear regression'], companies: ['Hugging Face', 'Meta', 'Microsoft'],
    statement: `<p>Fit y ≈ w·x + b (both start at 0) with SGD on the mean squared error, simulating gradient accumulation. Data is used in order (no shuffle), split into micro-batches of <code>micro_batch</code> (the last one may be shorter). For each micro-batch compute the gradient of <b>that micro-batch's mean</b> squared error, divide it by <code>accum_steps</code> and add it to the accumulated gradient. After every <code>accum_steps</code> micro-batches, and after the last micro-batch of the epoch, take a step (<code>w −= lr·gw</code>, <code>b −= lr·gb</code>) and reset the accumulated gradient.</p>
      <p>Write <code>train_with_accumulation(xs, ys, lr, epochs, micro_batch, accum_steps)</code> returning <code>[w, b]</code>.</p>`,
    constraints: `<p>1 ≤ len(xs) ≤ 10<sup>4</sup>; 1 ≤ epochs ≤ 100; compared with a relative tolerance of 1e-5.</p>`,
    example: `<p><code>xs = [1, 2, 3, 4], ys = [3, 5, 7, 9], lr = 0.05, 1 epoch</code>: micro_batch 2 with accum 2 gives <code class="c-g">[1.75, 0.6]</code>, the same as micro_batch 4 with accum 1, because equal-size micro-batches averaged over accum_steps reproduce the full batch's mean gradient. Micro_batch 2 with accum 1 takes two steps instead → [2.5475, 0.9325].</p>`,
    bruteWhy: `<p>Forgetting to divide by accum_steps makes the accumulated gradient accum_steps times too large (an accidental lr increase). Calling zero_grad every micro-batch silently throws away all but the last micro-batch. Both bugs still "train", which is why this is worth testing.</p>`,
    mcq: { q: `Accumulating 4 micro-batches of 8, what must you do to match a batch of 32 exactly (no BatchNorm)?`, options: ['Divide each micro-batch loss by 4 and step once after 4 backward calls', 'Step after every micro-batch', 'Multiply the learning rate by 4', 'Call zero_grad after every backward'], answer: 0, explain: `.grad sums the 4 backward calls; dividing each mean loss by 4 turns that sum into the mean over 32 examples.` },
    hints: [
      `Hint 1: Keep gw, gb as the ".grad" buffers: they only reset after an optimizer step.`,
      `Hint 2: For a micro-batch of m examples, the mean-MSE gradient is Σ 2·err·x / m for w and Σ 2·err / m for b, where err = w·x + b − y uses the CURRENT w, b.`,
      `Hint 3: Add grad / accum_steps; count micro-batches; step when the count hits accum_steps OR it is the last micro-batch of the epoch. Then reset the buffers and the count.`
    ],
    approach: `<p>Simulate the PyTorch pattern: <code>(loss / accum).backward()</code> each micro-batch, and <code>optimizer.step(); optimizer.zero_grad()</code> every accum micro-batches plus at the end of the epoch. The weights do not change between micro-batches of one group, so the accumulated gradient equals the large-batch gradient when micro-batches have equal size.</p>`,
    complexity: `<p>O(epochs · n) time, O(1) extra space: memory per step is that of one micro-batch, which is the whole point.</p>`,
    followUps: ['With a shorter last micro-batch, the result differs slightly from a true big batch. Why?', 'How does DDP\'s no_sync() make accumulation efficient across GPUs?']
  }));

  practice.push(PR('resume', {
    title: 'Resume From a Checkpoint: Why Optimizer State Matters', level: 'Hard', tags: ['checkpoints', 'momentum', 'schedulers'], companies: ['Google DeepMind', 'Anthropic', 'NVIDIA'],
    statement: `<p>Minimise f(w) = a·(w − c)<sup>2</sup> (gradient 2a(w − c)) from w0 with SGD + momentum (PyTorch form: the buffer is created as the gradient on the first step, then <code>buf = momentum·buf + g</code>; <code>w −= lr_t · buf</code>) and a StepLR schedule stepped every update: <code>lr_t = lr · gamma<sup>⌊t / step_size⌋</sup></code> for steps t = 0 … total_steps − 1.</p>
      <p>Just before step <code>crash_step</code> the job restarts from a checkpoint. Weights and scheduler position are always restored. If <code>restore_optimizer</code> is false, the momentum buffer is lost, so step crash_step behaves like a fresh optimizer's first step. Write <code>train_and_resume(w0, a, c, lr, momentum, step_size, gamma, total_steps, crash_step, restore_optimizer)</code> returning the final w.</p>`,
    constraints: `<p>1 ≤ total_steps ≤ 10<sup>5</sup>; 0 ≤ crash_step ≤ total_steps (crash_step = total_steps means no restart takes effect). Compared with a relative tolerance of 1e-5.</p>`,
    example: `<p><code>w0 = 0, a = 1, c = 3, lr = 0.1, momentum = 0.9, 2 steps, crash at 1</code>. Step 0: g = −6, buf = −6, w = 0.6. Step 1: g = −4.8. Restored: buf = 0.9·(−6) − 4.8 = −10.2, w = 0.6 + 1.02 = <code class="c-g">1.62</code>. Not restored: buf = −4.8, w = <code class="c-y">1.08</code>. Same weights, different futures.</p>`,
    bruteWhy: `<p>"Just save the weights" is the common shortcut. The model loads fine and training continues, but the momentum (or Adam moments) restart from zero and the scheduler, if not restored, restarts its warm-up, so the resumed run is not the run you would have had. That breaks reproducibility and can cause loss spikes.</p>`,
    mcq: { q: `Which of these does NOT need to be in a checkpoint for an exact resume?`, options: ['The gradients from the last step', 'Optimizer state', 'Scheduler state', 'The global step / epoch'], answer: 0, explain: `Gradients are recomputed from scratch after zero_grad at the next step. Optimizer and scheduler state and the position in training are needed.` },
    hints: [
      `Hint 1: Keep buf = None to mean "no buffer yet"; the first update sets buf = g, later ones buf = momentum·buf + g.`,
      `Hint 2: At t == crash_step and not restore_optimizer, set buf back to None before computing the update.`,
      `Hint 3: The lr at step t is lr · gamma ** (t // step_size) whether or not there was a crash, because the scheduler state is restored.`
    ],
    approach: `<p>Simulate the training loop step by step; the "crash" only changes one thing, the optimizer's momentum buffer, which is reset to "not created" when the optimizer state is not restored. Comparing both modes shows how much optimizer state affects the trajectory.</p>`,
    complexity: `<p>O(total_steps) time, O(1) space.</p>`,
    followUps: ['For AdamW, what exactly is lost if optimizer state is not restored?', 'Besides optimizer state, what must you restore to get the same data order after resuming?']
  }));

  practice.push(PR('fit', {
    title: 'Mini-Batch Training With Seeded Shuffling and Early Stopping', level: 'Hard', tags: ['training loop', 'DataLoader', 'early stopping', 'reproducibility'], companies: ['OpenAI', 'Meta', 'Airbnb'],
    statement: `<p>Put it all together. Fit y ≈ w·x + b (start at 0) with mini-batch SGD on mean squared error. Write <code>fit_with_early_stopping(x_train, y_train, x_val, y_val, lr, batch_size, max_epochs, patience, seed)</code>:</p>
      <ol><li>One generator for the whole run: <code>state = seed</code>. At the start of every epoch, shuffle the indices 0…n−1 with Fisher–Yates: for i from n − 1 down to 1, <code>state = (state * 1103515245 + 12345) % 2147483648</code>, <code>j = state % (i + 1)</code>, swap i and j (the state continues across epochs).</li>
      <li>Cut the shuffled order into batches of batch_size (keep the short last batch). For each batch, take one step with the gradient of that batch's mean squared error.</li>
      <li>After each epoch compute the validation MSE. If it is strictly lower than the best so far, record the epoch, the loss and the current w, b (a "checkpoint") and reset the counter; otherwise add 1, and stop when the counter reaches patience.</li></ol>
      <p>Return <code>[best_epoch, best_val_loss, best_w, best_b]</code>.</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>4</sup>; 1 ≤ max_epochs ≤ 1000; 1 ≤ patience. Compared with a relative tolerance of 1e-5.</p>`,
    example: `<p><code>x_train = [1, 2, 3, 4], y_train = [2, 4, 6, 8], x_val = [5], y_val = [10], lr = 0.02, batch 2, 5 epochs, patience 2, seed 1</code> → <code class="c-g">[4, 0.20675, 1.79650, 0.56281]</code> (rounded): the model is still improving at the last epoch, so the last epoch is the best.</p>
      <p>With <code>x = [1, 2, 3]</code>, <code>y = [1, 2, 3]</code> and a far too high lr 0.5, the loss explodes after the first epoch, so the best checkpoint is epoch 0 and training stops early.</p>`,
    bruteWhy: `<p>Typical mistakes that change the answer: re-seeding the generator every epoch (every epoch then has the same order), evaluating before the epoch's updates, returning the last weights instead of the best, or computing the batch gradient as a sum instead of a mean (an lr that silently scales with batch size).</p>`,
    mcq: { q: `Why use one generator that continues across epochs instead of reseeding with the same seed each epoch?`, options: ['So each epoch gets a different order while the whole run stays reproducible', 'Because reseeding is not allowed in Python', 'To make training faster', 'So that validation data is shuffled too'], answer: 0, explain: `Reseeding gives the identical order every epoch, which removes the benefit of shuffling. A single seeded generator (DataLoader(generator=g)) gives varied, repeatable orders.` },
    hints: [
      `Hint 1: Structure it like the PyTorch loop: for epoch: (shuffle → for each batch: step) → evaluate → early-stopping bookkeeping.`,
      `Hint 2: The batch gradient for m examples is Σ 2·err·x / m and Σ 2·err / m, computed with the weights from before this batch's step.`,
      `Hint 3: Save w and b at the moment you record a new best (they are your checkpoint). Break when the counter reaches patience; return the saved values, not the current ones.`
    ],
    approach: `<p>Implement the full loop: a seeded sampler that reshuffles every epoch, mini-batch SGD steps, an evaluation pass that never updates weights, and an early-stopping tracker that checkpoints the best weights and restores them at the end.</p>`,
    complexity: `<p>O(epochs · (n + n_val)) time; O(n) memory for the index order.</p>`,
    followUps: ['How would you add a ReduceLROnPlateau step to this loop, and in which order with early stopping?', 'What extra state would a checkpoint need so this run could be resumed mid-way with identical results?']
  }));

  // ===================== QUIZ =====================
  quiz.push({ q: `What is the broadcast shape of tensors with shapes <code>(5, 1, 4)</code> and <code>(3, 1)</code>?`, options: ['(5, 3, 4)', '(5, 3, 1)', 'Error', '(15, 4)'], answer: 0, explain: `Right-align: 4 vs 1 → 4; 1 vs 3 → 3; 5 vs missing → 5. Result (5, 3, 4).` });
  quiz.push({ q: `You run forward + <code>loss.backward()</code> twice without <code>optimizer.zero_grad()</code>. What is in <code>p.grad</code>?`, options: ['The sum of both gradients', 'Only the second gradient', 'Only the first gradient', 'An error is raised'], answer: 0, explain: `.grad accumulates (+=). That is why zero_grad is called once per update, and also what makes gradient accumulation work.` });
  quiz.push({ q: `Which statement about <code>model.eval()</code> is true?`, options: ['It changes Dropout and BatchNorm behaviour but does not disable gradient tracking', 'It disables gradient tracking', 'It freezes all parameters', 'It moves the model to the CPU'], answer: 0, explain: `eval() only flips the training flag. Use torch.no_grad() or torch.inference_mode() as well during evaluation.` });
  quiz.push({ q: `A 10-class classifier's model ends with <code>nn.Softmax</code> and is trained with <code>nn.CrossEntropyLoss</code>. What happens?`, options: ['It trains poorly: softmax is applied twice and gradients become weak', 'Nothing: this is the recommended setup', 'An error is raised', 'The loss becomes negative'], answer: 0, explain: `CrossEntropyLoss expects raw logits and applies log-softmax itself. Remove the softmax from the model (apply it only when you need probabilities at inference).` });
  quiz.push({ q: `Layers stored in a plain Python list inside an <code>nn.Module</code>...`, options: ['are not registered: their parameters are not returned by model.parameters() or moved by .to()', 'work exactly like nn.ModuleList', 'are automatically frozen', 'raise an error at construction'], answer: 0, explain: `Only attributes that are Modules/Parameters (or held in ModuleList/ModuleDict/ParameterList) are registered.` });
  quiz.push({ q: `Why is bf16 usually preferred over fp16 for training on A100/H100 GPUs?`, options: ['It has the same exponent range as fp32, so loss scaling is usually unnecessary', 'It has more mantissa bits than fp16', 'It uses less memory than fp16', 'It is required by torch.compile'], answer: 0, explain: `bf16 keeps 8 exponent bits (range up to ~3.4e38) at the cost of precision (7 mantissa bits vs fp16's 10). Both use 2 bytes.` });
  quiz.push({ q: `With <code>torch.amp.GradScaler</code>, what happens on a step where a gradient is inf?`, options: ['optimizer.step is skipped and the scale is reduced', 'The inf gradient is clipped to 65,504', 'Training stops with an error', 'The scale is doubled'], answer: 0, explain: `scaler.step skips the update when it finds inf/NaN, and scaler.update multiplies the scale by the backoff factor (0.5).` });
  quiz.push({ q: `In what order should these be called each training step?`, options: ['optimizer.step() then scheduler.step()', 'scheduler.step() then optimizer.step()', 'scheduler.step() then loss.backward()', 'Order never matters'], answer: 0, explain: `Since PyTorch 1.1 the scheduler should step after the optimizer; otherwise the first lr value is skipped and PyTorch warns.` });
  quiz.push({ q: `To resume training exactly where it stopped, which is the minimum you must save besides the model's state_dict?`, options: ['Optimizer and scheduler state_dicts plus the step/epoch (and scaler if fp16)', 'Nothing else', 'Only the epoch number', 'The whole Python process memory'], answer: 0, explain: `Momentum/Adam moments, the lr schedule position and the step counter all affect the next updates. RNG states are needed for bit-exact data order.` });
  quiz.push({ q: `What does <code>torch.load(path, weights_only=True)</code> (the default since PyTorch 2.6) protect against?`, options: ['Running arbitrary code hidden in a pickled checkpoint', 'Loading on the wrong device', 'Loading a checkpoint with missing keys', 'Out-of-memory errors'], answer: 0, explain: `Full unpickling can execute code. weights_only restricts loading to tensors and simple containers; safetensors avoids pickle altogether.` });
  quiz.push({ q: `You fine-tune a pretrained BERT for sentiment with lr = 1e-2 and accuracy collapses to chance. Most likely cause?`, options: ['The learning rate is far too high and destroys the pretrained weights', 'The batch size is too small', 'BERT cannot do sentiment analysis', 'Weight decay is too low'], answer: 0, explain: `Typical fine-tuning learning rates for transformers are 1e-5 to 5e-5 with warm-up. 1e-2 wipes out the pretrained features.` });
  quiz.push({ q: `Training loss falls steadily; validation loss falls until epoch 6 and then rises. What is happening and what should you keep?`, options: ['Overfitting: keep the checkpoint from epoch 6', 'Underfitting: train longer', 'Divergence: lower the learning rate', 'A data loader bug: shuffle the validation set'], answer: 0, explain: `The gap widening after the validation minimum is the classic overfitting signature. Early stopping restores the best-validation checkpoint.` });
  quiz.push({ q: `Gradients <code>[6, 8]</code> are clipped with <code>clip_grad_norm_(max_norm=5)</code>. Result (approximately)?`, options: ['[3, 4]', '[5, 5]', '[6, 8]', '[0.6, 0.8]'], answer: 0, explain: `Norm 10 > 5, so everything is multiplied by 5/10: [3, 4]. Direction unchanged.` });
  quiz.push({ q: `Which setting is NOT needed for reproducible PyTorch runs?`, options: ['torch.backends.cudnn.benchmark = True', 'torch.manual_seed(seed)', 'A seeded torch.Generator for the DataLoader', 'Seeding Python random and NumPy'], answer: 0, explain: `benchmark=True autotunes kernels by timing, which can choose different algorithms per run; set it to False (and use deterministic algorithms) for reproducibility.` });

  // ===================== INTERVIEW =====================
  interview.push({ q: `Write a PyTorch training loop from memory and explain each line.`, level: 'B',
    a: `<p>Per epoch: <code>model.train()</code>; for each batch move <code>xb, yb</code> to the device, <code>optimizer.zero_grad()</code> (gradients accumulate otherwise), <code>logits = model(xb)</code>, <code>loss = loss_fn(logits, yb)</code> (a scalar), <code>loss.backward()</code> (autograd fills <code>p.grad</code> for every parameter), optionally clip gradients, <code>optimizer.step()</code> (update), then <code>scheduler.step()</code> if it is per-step. Log <code>loss.item()</code>, not the tensor. Then evaluate: <code>model.eval()</code> and <code>torch.no_grad()</code>, accumulate loss and metrics over the validation loader, save a checkpoint if it is the best, and switch back to <code>train()</code>.</p>`,
    followUps: ['Where would gradient accumulation and mixed precision change this loop?', 'Why log loss.item() rather than loss?'] });
  interview.push({ q: `How does autograd work? What is a computational graph, and why do gradients accumulate?`, level: 'I',
    a: `<p>During the forward pass, every operation on a tensor with <code>requires_grad=True</code> records a node (its <code>grad_fn</code>) that knows its inputs and how to compute its local derivative, saving whatever it needs (e.g. both inputs of a multiplication). <code>loss.backward()</code> seeds dL/dL = 1, visits nodes in reverse topological order and applies the chain rule, sending upstream × local gradients to each input and <b>adding</b> them into leaf tensors' <code>.grad</code>. Adding is required because a tensor used in several places must sum the gradients from every path; a side effect is that gradients from successive backward calls also add up, which is why we zero them each step (and why accumulation over micro-batches works). The graph is rebuilt every forward ("define-by-run") and freed after backward unless <code>retain_graph=True</code>.</p>`,
    followUps: ['Why does reverse mode suit neural networks better than forward mode?', 'What do no_grad, detach and inference_mode each do?'] });
  interview.push({ q: `What is the difference between model.train() and model.eval(), and which layers care? What bugs come from getting it wrong?`, level: 'B',
    a: `<p>They set the <code>training</code> flag on every sub-module. Dropout zeroes random units (and scales survivors by 1/(1−p)) only in train mode; in eval mode it is the identity. BatchNorm normalises with the current batch's mean/variance and updates its running statistics in train mode; in eval it uses the stored running statistics. Bugs: forgetting <code>eval()</code> gives noisy, non-deterministic validation and bad single-example predictions (BatchNorm on one example); forgetting to switch back to <code>train()</code> after validation silently disables dropout and freezes BatchNorm statistics for the rest of training. eval() does not stop gradient tracking, so use <code>no_grad()</code> too.</p>`,
    followUps: ['Should a frozen pretrained backbone with BatchNorm be in train or eval mode during fine-tuning?', 'How do you check which mode every module is in?'] });
  interview.push({ q: `How do Dataset and DataLoader work together? How would you make data loading fast?`, level: 'I',
    a: `<p>A map-style Dataset returns one example from <code>__getitem__(i)</code> and its size from <code>__len__</code>. The DataLoader asks a sampler for indices (sequential or shuffled each epoch), groups them into batches, fetches examples (in <code>num_workers</code> parallel processes) and stacks them with a collate function (custom ones pad variable-length sequences). For speed: enough workers to keep the GPU busy, <code>pin_memory=True</code> with <code>non_blocking=True</code> copies, <code>persistent_workers</code>, prefetching, light Datasets that hold paths rather than decoded data, pre-tokenising once instead of in the loop, efficient formats (sharded files, memory-mapped arrays), and doing heavy augmentations on GPU if the CPU is the bottleneck. Measure: if GPU utilisation is low and the loader time per step is high, the input pipeline is the bottleneck.</p>`,
    followUps: ['How do you shard data across GPUs with DDP?', 'How do you make worker randomness reproducible?'] });
  interview.push({ q: `Explain mixed-precision training. What is the difference between fp16 and bf16, and why does fp16 need a GradScaler?`, level: 'I',
    a: `<p>Mixed precision runs most matmuls and convolutions in 16-bit inside <code>torch.autocast</code> while keeping master weights, optimizer state and sensitive ops (softmax, norms, losses, reductions) in fp32. It roughly doubles throughput on tensor-core GPUs and halves activation memory. fp16 has 5 exponent bits (max 65,504, smallest normal about 6e-5) and 10 mantissa bits; bf16 has fp32's 8 exponent bits but only 7 mantissa bits. With fp16, small gradients underflow to zero, so GradScaler multiplies the loss by a large factor before backward, unscales before the optimizer step, skips steps whose gradients overflow to inf/NaN and halves the scale, and periodically grows it again. bf16's range makes scaling unnecessary, so bf16 is the default on Ampere and newer.</p>`,
    followUps: ['Why do you unscale before gradient clipping?', 'What is FP8 training and what extra tricks does it need?'] });
  interview.push({ q: `Your model does not fit in GPU memory. What options do you have, roughly in order?`, level: 'A',
    a: `<p>First understand where memory goes: weights + gradients + optimizer state (about 16 bytes per parameter for fp32 AdamW) + activations (which grow with batch size and sequence length). Then: reduce the micro-batch and use gradient accumulation to keep the effective batch; use bf16/fp16 autocast; activation checkpointing (recompute activations in backward); memory-efficient attention (<code>F.scaled_dot_product_attention</code>); free graphs in evaluation with <code>no_grad</code>; an 8-bit or paged optimizer; parameter-efficient fine-tuning (LoRA, freezing most weights) which removes most gradient and optimizer memory; quantised base weights (QLoRA); and finally sharding across GPUs with FSDP or DeepSpeed ZeRO, or CPU offloading. Each trades speed or complexity for memory.</p>`,
    followUps: ['Estimate the memory to fully fine-tune a 7B model with AdamW.', 'What exactly does FSDP shard?'] });
  interview.push({ q: `Compare dropout, weight decay, data augmentation and early stopping as regularisers. How do you choose?`, level: 'I',
    a: `<p>All fight overfitting differently. Data augmentation creates new plausible examples and is often the most effective for images and audio; for text it is harder. Dropout randomly zeroes activations so units cannot co-adapt; it is common in MLP heads and smaller transformers, and often 0 in large LLM pretraining. Weight decay shrinks weights each step (decoupled in AdamW), preferring simpler functions; typical 0.01–0.1, not applied to biases and norm weights. Early stopping uses a validation set to stop when generalisation stops improving and restores the best checkpoint; it is nearly free and always worth having. I start with augmentation plus modest weight decay and early stopping, check the train/validation gap, and add dropout or more data if the gap is large; if both losses are high, I regularise less.</p>`,
    followUps: ['Why is L2 in the loss not the same as weight decay with Adam?', 'How does label smoothing act as a regulariser?'] });
  interview.push({ q: `Which learning-rate schedule would you use to fine-tune a transformer, and why use warm-up at all?`, level: 'I',
    a: `<p>Typically a linear warm-up over a few percent of the total optimizer steps (often 3–10%) followed by linear or cosine decay to zero or near zero, stepped every optimizer step, with AdamW at around 1e-5 to 5e-5. Warm-up matters because at the start Adam's second-moment estimates are poor and the randomly initialised head produces large, noisy gradients; full-size steps then can wreck pretrained weights or cause loss spikes. Decay at the end lowers gradient noise so the model settles into a good minimum. The total number of steps must account for gradient accumulation and the number of GPUs, otherwise the schedule ends at the wrong time. For training from scratch, one-cycle, cosine or warm-up–stable–decay schedules are common; ReduceLROnPlateau is a reactive alternative when you do not know the training length.</p>`,
    followUps: ['What breaks if the scheduler is stepped per epoch instead of per step?', 'How do you pick the peak learning rate?'] });
  interview.push({ q: `What do you save in a checkpoint, and what goes wrong when loading checkpoints?`, level: 'I',
    a: `<p>For inference: the model's state_dict (plus config and tokenizer/preprocessing). For resuming: also the optimizer, scheduler and GradScaler state_dicts, the epoch/global step, the best metric, RNG states and the sampler position, saved atomically, keeping the last few plus the best. Common problems: key prefixes from DDP (<code>module.</code>) or <code>torch.compile</code> (<code>_orig_mod.</code>); shape mismatches when the head changed (load with care and re-initialise the head); device mismatches (use <code>map_location</code>); creating the optimizer before moving the model; <code>strict=False</code> hiding missing layers; untrusted pickles (use <code>weights_only=True</code>, the default since PyTorch 2.6, or safetensors); and BatchNorm buffers missing if they were registered as non-persistent.</p>`,
    followUps: ['How do you checkpoint a model sharded across 64 GPUs?', 'How would you verify a resume is exact?'] });
  interview.push({ q: `You have 2,000 labelled images for a 5-class problem. Walk me through a transfer-learning approach.`, level: 'I',
    a: `<p>Start from a strong pretrained backbone (e.g. a ResNet, EfficientNet or ViT from torchvision/timm, or a CLIP/DINOv2 encoder) and use its exact preprocessing. Baseline: freeze the backbone, replace the final layer with a 5-way Linear head, train only the head with AdamW at ~1e-3, with augmentation (random crops, flips, colour jitter) and a stratified validation split. Then fine-tune: unfreeze the top block(s) with a 10× lower lr (discriminative learning rates), warm-up and cosine decay, weight decay, early stopping on validation loss, keeping the best checkpoint. With so little data, watch the train/validation gap closely, use cross-validation for model selection, report per-class metrics, and compare with a linear probe on frozen features from a few backbones; often the frozen-feature probe is already very strong.</p>`,
    followUps: ['When would full fine-tuning be worse than a linear probe?', 'How would the plan change for text with a Hugging Face model?'] });
  interview.push({ q: `How would you fine-tune a pretrained Hugging Face model for text classification? What does the Trainer do for you?`, level: 'I',
    a: `<p>Load the tokenizer and <code>AutoModelForSequenceClassification.from_pretrained(name, num_labels=K)</code> (the body is pretrained, the classification head is newly initialised, so the warning about new weights is expected). Tokenise the dataset once with <code>datasets.map(batched=True)</code> and truncation, and use <code>DataCollatorWithPadding</code> for dynamic padding. Set <code>TrainingArguments</code>: lr around 2e-5, batch size, a few epochs, weight decay 0.01, warm-up, a linear schedule, bf16, evaluation and saving per epoch, <code>load_best_model_at_end</code> with a metric, and a seed. The Trainer runs the loop: device placement, mixed precision, gradient accumulation, the scheduler, evaluation with <code>compute_metrics</code>, checkpoint rotation and resuming, logging, and multi-GPU via Accelerate. Passing <code>labels</code> makes the model compute the cross-entropy loss itself.</p>`,
    followUps: ['When would you write a custom loop instead of using Trainer?', 'How does LoRA via PEFT change this setup?'] });
  interview.push({ q: `Your training loss is not decreasing. How do you debug it systematically?`, level: 'A',
    a: `<p>Check the data first: print a batch after the DataLoader with shapes, dtypes, ranges and decoded labels; check that inputs and labels are aligned after shuffling. Check the initial loss (≈ ln C for C balanced classes). Try to overfit one small batch with regularisation off: if the loss does not go near zero it is a bug. Then check gradients: are they None or zero for some parameters (detached graph, frozen layers, <code>argmax</code> or <code>.item()</code> in the loss path, an optimizer built over the wrong parameters, missing <code>optimizer.step()</code>)? Check the loss inputs (logits vs probabilities, target dtype and shape, a broadcasting bug like (N,1) vs (N,)). Only then tune: learning-rate range test, warm-up, initialisation, normalisation. Change one thing at a time against a seeded baseline.</p>`,
    followUps: ['What is the significance of a loss stuck at exactly ln(C)?', 'What would you log every step?'] });
  interview.push({ q: `Your loss becomes NaN in the middle of training. What are the likely causes and how do you find the culprit?`, level: 'A',
    a: `<p>Typical causes: the learning rate is too high or warm-up too short (the gradient norm grows before the NaN); fp16 overflow above 65,504 or underflow; numerically unsafe maths such as log(0), sqrt at 0 in backward, division by a near-zero norm, exp of large values, or multiplying a masked inf by 0; and bad data (a corrupt example, an empty sequence, a label out of range). To find it: log loss, gradient norm, lr and batch ids each step and stop at the first non-finite loss; replay that batch; enable <code>torch.autograd.detect_anomaly()</code> to name the operation; check activations with forward hooks. Fixes: lower lr, warm-up, gradient clipping, bf16 or GradScaler, losses computed from logits (<code>log_softmax</code>, <code>BCEWithLogitsLoss</code>), epsilons, and data validation.</p>`,
    followUps: ['Why does a single NaN destroy the whole model in one step?', 'How does GradScaler interact with NaNs that are not caused by fp16?'] });
  interview.push({ q: `How do you make a PyTorch experiment reproducible, and what limits are there?`, level: 'I',
    a: `<p>Seed Python's <code>random</code>, NumPy and <code>torch.manual_seed</code> (which covers CUDA); give the DataLoader a seeded <code>generator</code> and a <code>worker_init_fn</code> that seeds each worker; set <code>torch.backends.cudnn.benchmark = False</code>; and for bit-exact GPU runs call <code>torch.use_deterministic_algorithms(True)</code> with <code>CUBLAS_WORKSPACE_CONFIG=:4096:8</code>, accepting some slowdown and errors for ops with no deterministic version. Record code commit, config, data version, library and driver versions, and hardware. Limits: results can still differ across GPU models, CUDA/cuDNN/PyTorch versions and numbers of GPUs, because floating-point addition order changes. So report the mean and spread over several seeds rather than relying on one lucky run.</p>`,
    followUps: ['Why does atomicAdd make some GPU ops non-deterministic?', 'What must a checkpoint contain for an exact resume of data order?'] });
  interview.push({ q: `An AI assistant wrote your training script. What do you review before trusting its results?`, level: 'E',
    a: `<p>The data path: correct train/validation/test split with no leakage, shuffle only on training, labels aligned, preprocessing matching any pretrained model. The loop: <code>zero_grad</code>/<code>backward</code>/<code>step</code> order, <code>train()</code>/<code>eval()</code> switching, <code>no_grad</code> in evaluation, <code>.item()</code> for logging, loss given logits with the right target dtype, scheduler stepped at the right granularity with the right total steps (accumulation, GPUs). Precision and devices: no hard-coded <code>.cuda()</code>, GradScaler only for fp16, unscale before clipping. Checkpoints: best-model restore, optimizer/scheduler state saved, <code>weights_only</code> loading. Then I test it: overfit one batch, check the initial loss, assert shapes, verify that every trainable parameter gets a gradient, and run two seeds to see the noise level before believing any improvement.</p>`,
    followUps: ['Which of these checks would you turn into automated tests?', 'How would you detect data leakage between train and validation?'] });

  registerModule({
    id: 'ai27',
    title: 'Deep Learning in Practice with PyTorch',
    lang: 'python',
    langExplain: `<p>The explanations and the PyTorch examples in this module use Python, because the AI track uses Python. The PyTorch, torchvision and Hugging Face snippets show the real code you would write at work; they are marked "shown, not run here" because the site and its test runner do not install PyTorch. Every tested problem has a solution in <b>Python, Java, JavaScript, C++ and C#</b> (plain code, no libraries), re-building one mechanism PyTorch normally hides (autograd, a seeded DataLoader, an SGD step, GradScaler, schedulers, clipping, early stopping), so you can see exactly what the library does and the tests can check it.</p>`,
    intro: `<p>In <i>Neural Networks &amp; Deep Learning Basics</i> you met layers, activations and backpropagation, and in <i>Calculus &amp; Optimization</i> you computed gradients and optimiser updates by hand. This module is the hands-on follow-up: how real models are trained, every day, with <b>PyTorch 2.x</b>.</p>
      <p>You will work with tensors, shapes and broadcasting; let <b>autograd</b> compute gradients; package models as <code>nn.Module</code>s and feed them with <code>Dataset</code> and <code>DataLoader</code>; write the <b>training loop</b> with the right loss and optimizer and the right train/eval mode; run on GPUs with <b>mixed precision</b>; regularise with dropout, weight decay and early stopping and tune <b>learning-rate schedules</b>; save and resume <b>checkpoints</b>; <b>fine-tune pretrained models</b> with torchvision and Hugging Face; and <b>debug</b> training that diverges, stalls or overfits, reproducibly.</p>
      <p>Each topic shows the idiomatic PyTorch code, then makes you rebuild the key mechanism in plain Python in a tested problem, so you understand what the one-liners do.</p>`,
    goals: [
      'Reason about tensor shapes, dtypes, devices and broadcasting, and spot silent broadcasting bugs',
      'Explain how autograd builds a graph and accumulates gradients, and build a tiny scalar autograd engine',
      'Write nn.Module models, custom Datasets and DataLoaders with reproducible shuffling and padding collate functions',
      'Write a complete training and evaluation loop with the correct loss, optimizer, train/eval mode and no_grad',
      'Train on GPUs with bf16/fp16 autocast and GradScaler, and estimate training memory',
      'Apply dropout, weight decay, early stopping and learning-rate schedules (StepLR, cosine, warm restarts, warm-up, plateau)',
      'Save and resume full checkpoints and fine-tune pretrained models with torchvision and Hugging Face Trainer',
      'Debug divergence, NaNs, stalled training and overfitting from the loss curves, and make runs reproducible'
    ],
    prereqs: `<p><b>Needed:</b> <i>Neural Networks &amp; Deep Learning Basics</i> (AI track): layers, activations, the forward pass, backpropagation, optimisers, CNN and RNN ideas. <i>Calculus &amp; Optimization for Machine Learning</i> (AI track): gradients, the chain rule, gradient descent, MSE and cross-entropy, Adam/AdamW, overfitting and early stopping, which this module puts into practice. Comfortable Python (classes, list comprehensions, functions) is assumed. A GPU is not needed to follow the module; Google Colab or Kaggle notebooks give free GPUs if you want to run the PyTorch snippets.</p>`,
    hours: 12,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
