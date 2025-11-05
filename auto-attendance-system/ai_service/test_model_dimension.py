"""Test script to check FaceNet model embedding dimensions"""
import torch
from facenet_pytorch import InceptionResnetV1
import numpy as np

print("Testing FaceNet model dimensions...")
print("-" * 50)

# Test casia-webface
print("\n1. Testing casia-webface model:")
model_casia = InceptionResnetV1(pretrained='casia-webface').eval()
print(f"   Model loaded: {model_casia.__class__.__name__}")

# Create a dummy input (batch_size=1, channels=3, height=160, width=160)
dummy_input = torch.randn(1, 3, 160, 160)

with torch.no_grad():
    embedding_casia = model_casia(dummy_input)
    print(f"   Output shape: {embedding_casia.shape}")
    print(f"   Embedding dimension: {embedding_casia.shape[1]}")

print("\n2. Testing vggface2 model:")
model_vgg = InceptionResnetV1(pretrained='vggface2').eval()
print(f"   Model loaded: {model_vgg.__class__.__name__}")

with torch.no_grad():
    embedding_vgg = model_vgg(dummy_input)
    print(f"   Output shape: {embedding_vgg.shape}")
    print(f"   Embedding dimension: {embedding_vgg.shape[1]}")

print("\n" + "-" * 50)
print("Summary:")
print(f"  casia-webface produces: {embedding_casia.shape[1]}-dimensional embeddings")
print(f"  vggface2 produces: {embedding_vgg.shape[1]}-dimensional embeddings")
