import requests

get_score_url = "https://sinhvien.huce.edu.vn/AppSVGV/api/v1/SinhVien/KetQuaHocTap?"
def get_scores(access_token,student_id):
    payload = {
        "idSinhVien": student_id
    }
    headers = {
        "accept": "application/json",
        "authorization": f"Bearer {access_token}",
        "language": "vi",
        "user-agent": "Dart/3.0 (dart:io)"
    }

    response = requests.post(get_score_url, json=payload, headers=headers)
    response.raise_for_status()

    return response.json()

# if __name__ == "__main__":
#     access_token = input("Access Token: ")
#     student_id = input("Student ID: ")
#     data = get_scores(access_token, student_id)
#     print(data)
