# Module 06: Computer Vision 👁️

## 🎯 Overview

Computer Vision enables machines to understand and process visual information. Learn CNNs, object detection, and modern architectures like Vision Transformers.

---

## 📖 Digital Images

### What is an Image?

```python
import numpy as np

# Grayscale image: 2D array of pixel intensities (0-255)
grayscale = np.array([
    [0, 50, 100],
    [150, 200, 255],
    [100, 50, 0]
])  # 3x3 image

# Color image: 3D array (Height x Width x Channels)
# Channels: Red, Green, Blue
color_image = np.random.randint(0, 256, (224, 224, 3))  # 224x224 RGB

# Image properties
print(f"Shape: {color_image.shape}")  # (224, 224, 3)
print(f"Total pixels: {224 * 224}")   # 50,176
print(f"Total values: {224 * 224 * 3}") # 150,528
```

---

## 🔲 Convolutions: The Core Operation

### What is Convolution?

A sliding window operation that extracts features from images.

```python
def convolve2d(image, kernel):
    """Apply convolution to an image."""
    h, w = image.shape
    kh, kw = kernel.shape

    # Output dimensions
    out_h = h - kh + 1
    out_w = w - kw + 1

    output = np.zeros((out_h, out_w))

    for i in range(out_h):
        for j in range(out_w):
            # Extract patch
            patch = image[i:i+kh, j:j+kw]
            # Element-wise multiply and sum
            output[i, j] = np.sum(patch * kernel)

    return output

# Edge detection kernel
sobel_x = np.array([
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
])

# Blur kernel
blur = np.array([
    [1/9, 1/9, 1/9],
    [1/9, 1/9, 1/9],
    [1/9, 1/9, 1/9]
])

# Sharpen kernel
sharpen = np.array([
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
])
```

---

## 🏗️ Convolutional Neural Network (CNN)

### Architecture

```
Input → [Conv → ReLU → Pool] × N → Flatten → Dense → Output

Key components:
1. Convolutional Layer: Learn filters
2. Activation (ReLU): Add non-linearity
3. Pooling: Reduce spatial dimensions
4. Fully Connected: Classification
```

### Implementation

```python
class ConvLayer:
    """Convolutional layer from scratch."""

    def __init__(self, in_channels, out_channels, kernel_size, stride=1, padding=0):
        self.in_channels = in_channels
        self.out_channels = out_channels
        self.kernel_size = kernel_size
        self.stride = stride
        self.padding = padding

        # Initialize filters (out_channels x in_channels x kh x kw)
        self.filters = np.random.randn(
            out_channels, in_channels, kernel_size, kernel_size
        ) * 0.01
        self.bias = np.zeros(out_channels)

    def forward(self, x):
        """
        x shape: (batch, in_channels, height, width)
        output shape: (batch, out_channels, new_height, new_width)
        """
        batch_size, _, h, w = x.shape

        # Apply padding
        if self.padding > 0:
            x = np.pad(x, ((0,0), (0,0), (self.padding, self.padding),
                          (self.padding, self.padding)))

        # Output dimensions
        out_h = (h + 2*self.padding - self.kernel_size) // self.stride + 1
        out_w = (w + 2*self.padding - self.kernel_size) // self.stride + 1

        output = np.zeros((batch_size, self.out_channels, out_h, out_w))

        for b in range(batch_size):
            for f in range(self.out_channels):
                for i in range(out_h):
                    for j in range(out_w):
                        h_start = i * self.stride
                        w_start = j * self.stride
                        h_end = h_start + self.kernel_size
                        w_end = w_start + self.kernel_size

                        receptive_field = x[b, :, h_start:h_end, w_start:w_end]
                        output[b, f, i, j] = np.sum(receptive_field * self.filters[f]) + self.bias[f]

        return output


class MaxPool2D:
    """Max pooling layer."""

    def __init__(self, pool_size=2, stride=2):
        self.pool_size = pool_size
        self.stride = stride

    def forward(self, x):
        batch_size, channels, h, w = x.shape

        out_h = (h - self.pool_size) // self.stride + 1
        out_w = (w - self.pool_size) // self.stride + 1

        output = np.zeros((batch_size, channels, out_h, out_w))

        for b in range(batch_size):
            for c in range(channels):
                for i in range(out_h):
                    for j in range(out_w):
                        h_start = i * self.stride
                        w_start = j * self.stride

                        pool_region = x[b, c,
                                       h_start:h_start+self.pool_size,
                                       w_start:w_start+self.pool_size]
                        output[b, c, i, j] = np.max(pool_region)

        return output


class SimpleCNN:
    """Simple CNN for image classification."""

    def __init__(self, num_classes=10):
        # Conv layers
        self.conv1 = ConvLayer(3, 32, kernel_size=3, padding=1)
        self.conv2 = ConvLayer(32, 64, kernel_size=3, padding=1)
        self.pool = MaxPool2D(pool_size=2, stride=2)

        # Fully connected (assuming 224x224 input → 56x56 after 2 pools)
        self.fc1_weights = np.random.randn(64 * 56 * 56, 512) * 0.01
        self.fc2_weights = np.random.randn(512, num_classes) * 0.01

    def forward(self, x):
        # Conv block 1
        x = self.conv1.forward(x)
        x = np.maximum(0, x)  # ReLU
        x = self.pool.forward(x)

        # Conv block 2
        x = self.conv2.forward(x)
        x = np.maximum(0, x)  # ReLU
        x = self.pool.forward(x)

        # Flatten
        batch_size = x.shape[0]
        x = x.reshape(batch_size, -1)

        # Fully connected
        x = np.maximum(0, np.dot(x, self.fc1_weights))  # FC + ReLU
        x = np.dot(x, self.fc2_weights)  # Output logits

        return x
```

---

## 🎯 Object Detection

### YOLO (You Only Look Once)

```
Key idea: Single forward pass for detection
1. Divide image into SxS grid
2. Each cell predicts B bounding boxes
3. Each box: (x, y, w, h, confidence, class_probs)
```

### Bounding Box Format

```python
# Box formats
# (x1, y1, x2, y2) - corners
# (x_center, y_center, width, height) - center

def xyxy_to_xywh(box):
    """Convert corners to center format."""
    x1, y1, x2, y2 = box
    w = x2 - x1
    h = y2 - y1
    x_center = x1 + w/2
    y_center = y1 + h/2
    return (x_center, y_center, w, h)

def iou(box1, box2):
    """Intersection over Union - overlap measure."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    intersection = max(0, x2-x1) * max(0, y2-y1)

    area1 = (box1[2]-box1[0]) * (box1[3]-box1[1])
    area2 = (box2[2]-box2[0]) * (box2[3]-box2[1])

    union = area1 + area2 - intersection

    return intersection / union if union > 0 else 0

# Non-Maximum Suppression
def nms(boxes, scores, iou_threshold=0.5):
    """Remove overlapping detections."""
    indices = np.argsort(scores)[::-1]
    keep = []

    while len(indices) > 0:
        current = indices[0]
        keep.append(current)

        if len(indices) == 1:
            break

        ious = [iou(boxes[current], boxes[i]) for i in indices[1:]]
        indices = indices[1:][np.array(ious) < iou_threshold]

    return keep
```

---

## 🔄 Vision Transformers (ViT)

```python
class VisionTransformer:
    """
    ViT: Treat image as sequence of patches.

    1. Split image into 16x16 patches
    2. Flatten and project to embedding
    3. Add position embeddings
    4. Apply Transformer encoder
    5. Use [CLS] token for classification
    """

    def __init__(self, image_size=224, patch_size=16, dim=768, num_classes=1000):
        self.patch_size = patch_size
        self.num_patches = (image_size // patch_size) ** 2

        # Patch embedding
        self.patch_embed = np.random.randn(3 * patch_size**2, dim) * 0.01

        # Class token and position embeddings
        self.cls_token = np.random.randn(1, 1, dim) * 0.01
        self.pos_embed = np.random.randn(1, self.num_patches + 1, dim) * 0.01

        # Transformer layers would go here
        # Classification head
        self.classifier = np.random.randn(dim, num_classes) * 0.01

    def patchify(self, images):
        """Convert images to patch sequences."""
        batch_size, c, h, w = images.shape
        p = self.patch_size

        # Reshape to patches
        patches = images.reshape(batch_size, c, h//p, p, w//p, p)
        patches = patches.transpose(0, 2, 4, 1, 3, 5)
        patches = patches.reshape(batch_size, self.num_patches, -1)

        return patches

    def forward(self, images):
        # 1. Patchify and embed
        patches = self.patchify(images)
        x = np.dot(patches, self.patch_embed)

        # 2. Add class token
        batch_size = images.shape[0]
        cls_tokens = np.tile(self.cls_token, (batch_size, 1, 1))
        x = np.concatenate([cls_tokens, x], axis=1)

        # 3. Add position embeddings
        x = x + self.pos_embed

        # 4. Transformer encoder (simplified)
        # ... attention layers ...

        # 5. Classification from CLS token
        cls_output = x[:, 0]
        logits = np.dot(cls_output, self.classifier)

        return logits
```

---

## 📊 Common Metrics

| Metric   | Formula                | Use Case          |
| -------- | ---------------------- | ----------------- |
| Accuracy | Correct / Total        | Balanced classes  |
| mAP      | Mean Average Precision | Object detection  |
| IoU      | Intersection / Union   | Segmentation      |
| FPS      | Frames per second      | Real-time systems |

---

## ✏️ Exercises

1. Implement edge detection using convolution
2. Build a simple CNN for MNIST
3. Implement IoU and NMS from scratch
4. Train a model to classify cats vs dogs

---

_Next Module: 07_mlops_pipeline.md - Production ML Systems_
