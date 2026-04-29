
import numpy as np
import sys
import os

# Add project root to path
sys.path.append(r"c:\Users\shiva\Desktop\windows_app\conductor")

from apps.science.reservoir_computing import EchoStateNetwork

def test_esn():
    print("--- Echo State Network (ESN) Demo ---")
    print("Generating Signal: Sine Wave t=[0, 100]")
    t = np.linspace(0, 100, 1000)
    data = np.sin(t) + 0.1 * np.sin(t * 0.1) # Mixed signal
    
    # Prepare X, y (Next step prediction)
    # Reshape to (Samples, Features)
    X = data[:-1].reshape(-1, 1)
    y = data[1:].reshape(-1, 1)
    
    # Split Train/Test
    train_len = 800
    X_train, y_train = X[:train_len], y[:train_len]
    X_test, y_test = X[train_len:], y[train_len:]
    
    print(f"Training on {train_len} samples...")
    esn = EchoStateNetwork(input_dim=1, reservoir_size=100, output_dim=1, spectral_radius=0.95)
    
    # Train
    esn.fit(X_train.tolist(), y_train.tolist())
    
    print("Predicting test set...")
    # Note: State is carried over from training if we don't reset. 
    # This is correct for continuous time series.
    preds = esn.predict(X_test.tolist())
    
    preds_arr = np.array(preds)
    actual_arr = np.array(y_test)
    
    mse = np.mean((preds_arr - actual_arr)**2)
    print(f"Test MSE: {mse:.6f}")
    
    if mse < 0.05:
        print("✅ PASS: ESN successfully learned the dynamics.")
    else:
        print(f"❌ FAIL: High Error. MSE: {mse}")

if __name__ == "__main__":
    test_esn()
