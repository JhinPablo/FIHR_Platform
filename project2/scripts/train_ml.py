"""Training entrypoint for the MIMIC-IV tabular model.

Expected authorized local input:
  datasets/mimic-iv/hosp/patients.csv.gz
  datasets/mimic-iv/hosp/admissions.csv.gz
  datasets/mimic-iv/hosp/labevents.csv.gz
  datasets/mimic-iv/hosp/d_labitems.csv.gz

The production path should extract clinically meaningful tabular features,
train a calibrated CPU-deployable model, and export models/ml_model.onnx.
"""


def main() -> None:
    print("TODO: train calibrated MIMIC-IV tabular model and export models/ml_model.onnx")


if __name__ == "__main__":
    main()
