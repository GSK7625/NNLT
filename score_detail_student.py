import requests

get_score_detail_url = "https://sinhvien.huce.edu.vn/AppSVGV/api/v1/SinhVien/KetQuaHocTapChiTiet?"
def get_score_detail(access_token, student_id, LopHocPhan_id):
    payload = {
        "idSinhVien": student_id,
        "idLopHocPhan": LopHocPhan_id
    }
    headers = {
        "accept": "application/json",
        "authorization": f"Bearer {access_token}",
        "language": "vi",
        "user-agent": "Dart/3.0 (dart:io)"
    }

    response = requests.post(get_score_detail_url, json=payload, headers=headers)
    response.raise_for_status()

    return response.json()