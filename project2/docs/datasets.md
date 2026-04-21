# Datasets: demos publicos de PhysioNet

Este proyecto usa datasets demo de acceso abierto, disponibles sin credenciales
en PhysioNet:

- **MIMIC-IV Clinical Database Demo on FHIR v2.1.0** para pacientes,
  encuentros, observaciones, medicamentos y otros recursos FHIR ya convertidos.
- **MIMIC-IV-ECG Demo v0.1** para ECG diagnosticos de 12 derivaciones en
  formato WFDB (`.hea` + `.dat`), enlazables por `subject_id`.

Estos demos reemplazan el requisito anterior de usar datasets MIMIC completos
con acceso controlado durante el desarrollo academico. El sistema conserva
la arquitectura de interoperabilidad: Supabase PostgreSQL para datos
normalizados, MinIO para objetos clinicos y FHIR-Lite/FHIR R4 para la API.

## Acceso y licencia

Ambos recursos estan publicados como **Open Access** en PhysioNet. Las paginas
oficiales indican que cualquiera puede acceder a los archivos siempre que cumpla
los terminos de la licencia, y ambos usan **Open Data Commons Open Database
License v1.0**.

Fuentes oficiales:

- MIMIC-IV-ECG Demo v0.1:
  <https://physionet.org/content/mimic-iv-ecg-demo/0.1/>
- MIMIC-IV Clinical Database Demo on FHIR v2.1.0:
  <https://physionet.org/content/mimic-iv-fhir-demo/2.1.0/>

## Citas requeridas

Para el informe legal/metodologico, citar:

1. Gow, B., Pollard, T., Nathanson, L. A., Moody, B., Johnson, A.,
   Moukheiber, D., Greenbaum, N., Berkowitz, S., Eslami, P., Herbst, E.,
   Mark, R., & Horng, S. (2022). *MIMIC-IV-ECG Demo - Diagnostic
   Electrocardiogram Matched Subset Demo* (version 0.1). PhysioNet.
   <https://doi.org/10.13026/4eqn-kt76>
2. Bennett, A., Ulrich, H., Wiedekopf, J., Szul, P., Grimes, J.,
   & Johnson, A. (2025). *MIMIC-IV Clinical Database Demo on FHIR*
   (version 2.1.0). PhysioNet. RRID:SCR_007345.
3. Bennett, A. M., Ulrich, H., van Damme, P., Wiedekopf, J., &
   Johnson, A. E. W. (2023). MIMIC-IV on FHIR: converting a decade of
   in-patient data into an exchangeable, interoperable format. *Journal of
   the American Medical Informatics Association*, 30(4), 718-725.
   <https://doi.org/10.1093/jamia/ocac203>
4. Goldberger, A. L., Amaral, L. A. N., Glass, L., Hausdorff, J. M.,
   Ivanov, P. C., Mark, R. G., Mietus, J. E., Moody, G. B., Peng, C. K.,
   & Stanley, H. E. (2000). PhysioBank, PhysioToolkit, and PhysioNet:
   Components of a new research resource for complex physiologic signals.
   *Circulation*, 101(23), e215-e220.

## Estructura local esperada

Los datasets se dejaron localmente para referencia en:

```text
project2/datasets/
  mimic-iv-fhir-demo-2.1.0/
    LICENSE.txt
    README_DEMO.md
    SHA256SUMS.txt
    fhir/
      MimicPatient.ndjson.gz
      MimicEncounter.ndjson.gz
      MimicObservationLabevents.ndjson.gz
      ...
  mimic-iv-ecg-demo-0.1/
    LICENSE.txt
    RECORDS
    record_list.csv
    SHA256SUMS.txt
    files/
      p10000032/
        s107143276/
          107143276.hea
          107143276.dat
```

`project2/datasets/` sigue ignorado por Git para evitar subir datos y archivos
pesados al repositorio, aunque estos demos sean publicos.

## Seed publico

Con Docker:

```bash
cd project2
docker compose --profile seed run --rm seed
```

Sin Docker:

```bash
python scripts/seed_physionet_demo.py \
  --fhir-root datasets/mimic-iv-fhir-demo-2.1.0 \
  --ecg-root datasets/mimic-iv-ecg-demo-0.1 \
  --limit-subjects 30 \
  --max-observations-per-subject 8 \
  --max-ecg-records 30
```

El script:

- Lee `MimicPatient.ndjson.gz` y crea `patients`.
- Lee `MimicEncounter.ndjson.gz` y crea `encounters`.
- Lee `MimicObservationLabevents.ndjson.gz` y crea `observations`.
- Lee `record_list.csv` del ECG demo y prioriza pacientes con ECG real.
- Sube `.hea` y `.dat` WFDB reales a MinIO.
- Crea `Media`/`ImagingStudy` con modalidad `ECG`.
- Crea `DiagnosticReport` enlazado a cada ECG.
- Crea `Consent` academico `PHYSIONET_OPEN_ACCESS_DEMO`.
- Enlaza el usuario `paciente` de prueba al primer paciente importado.

## Validacion

Despues del seed:

```bash
curl http://localhost:8000/data/status \
  -H "X-Access-Key: dev-access-admin" \
  -H "X-Permission-Key: dev-permission-admin"
```

El dashboard consume ese endpoint y muestra conteos reales de Supabase/SQLite
local y objetos indexados en MinIO.
