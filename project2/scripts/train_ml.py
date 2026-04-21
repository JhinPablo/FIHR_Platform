"""Training entrypoint for the MIMIC-IV FHIR demo tabular model.

Expected real input:
  datasets/mimic-iv-fhir-demo-2.1.0/fhir/*.ndjson.gz

The repo intentionally excludes datasets and generated model binaries. The
production version should train a CPU-friendly classifier, calibrate
probabilities, export ONNX, and write model cards/metrics.
"""


def main():
    print("TODO: train calibrated MIMIC-IV FHIR demo tabular model and export models/ml_model.onnx")


if __name__ == "__main__":
    main()
