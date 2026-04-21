"""Training entrypoint for the MIMIC-CXR-JPG image model.

Expected authorized local input:
  datasets/mimic-cxr-jpg/mimic-cxr-2.0.0-metadata.csv.gz
  datasets/mimic-cxr-jpg/mimic-cxr-2.0.0-chexpert.csv.gz
  datasets/mimic-cxr-jpg/files/

The production path should train a compact CXR classifier, generate image
explanations when available, and export models/dl_model.onnx.
"""


def main() -> None:
    print("TODO: train MIMIC-CXR-JPG image model and export models/dl_model.onnx")


if __name__ == "__main__":
    main()
