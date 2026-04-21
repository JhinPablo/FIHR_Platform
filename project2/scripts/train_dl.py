"""Training entrypoint for the MIMIC-IV-ECG demo waveform model.

Expected real input:
  datasets/mimic-iv-ecg-demo-0.1/record_list.csv
  datasets/mimic-iv-ecg-demo-0.1/files/

The repo intentionally excludes datasets and generated model binaries. The
production version should train a compact CPU-deployable ECG classifier,
export ONNX INT8, and generate waveform attribution artifacts for explainability.
"""


def main():
    print("TODO: train MIMIC-IV-ECG waveform model and export models/dl_model.onnx")


if __name__ == "__main__":
    main()
