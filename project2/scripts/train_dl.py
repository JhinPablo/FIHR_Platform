"""Training entrypoint for the MIMIC-CXR-JPG image model.

Expected real input:
  datasets/mimic-cxr-jpg/files/

The repo intentionally excludes datasets and generated model binaries. The
production version should train a compact CPU-deployable CXR classifier,
export ONNX INT8, and generate Grad-CAM artifacts for explainability.
"""


def main():
    print("TODO: train MIMIC-CXR-JPG image model and export models/dl_model.onnx")


if __name__ == "__main__":
    main()

