from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


MEDICO_HEADERS = {
    "X-Access-Key": "dev-access-medico-1",
    "X-Permission-Key": "dev-permission-medico-1",
}
ADMIN_HEADERS = {
    "X-Access-Key": "dev-access-admin",
    "X-Permission-Key": "dev-permission-admin",
}


def test_missing_access_key_is_401():
    res = client.get("/fhir/Patient", headers={"X-Permission-Key": "dev-permission-medico-1"})
    assert res.status_code == 401


def test_medico_cannot_delete_patient_without_admin_role():
    created = client.post(
        "/fhir/Patient",
        headers=MEDICO_HEADERS,
        json={"resourceType": "Patient", "name": "Test Patient"},
    )
    assert created.status_code == 201
    patient_id = created.json()["id"]
    denied = client.delete(f"/fhir/Patient/{patient_id}", headers=MEDICO_HEADERS)
    assert denied.status_code == 403
    allowed = client.delete(f"/fhir/Patient/{patient_id}", headers=ADMIN_HEADERS)
    assert allowed.status_code == 200


def test_patient_pagination_bundle_shape():
    res = client.get("/fhir/Patient?limit=10&offset=0", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    body = res.json()
    assert body["resourceType"] == "Bundle"
    assert body["limit"] == 10
    assert "entry" in body

