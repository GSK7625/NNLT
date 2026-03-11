import requests

getstudent_id_url = "https://sinhvien.huce.edu.vn/AppSVGV/api/v1/SinhVien/Info?"
def get_student_id(access_token):
    payload = {}
    headers = {
        "accept": "application/json",
        "authorization": f"Bearer {access_token}",
        "language": "vi",
        "user-agent": "Dart/3.0 (dart:io)"
    }
    response = requests.post(getstudent_id_url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    return data["result"]["idSinhVien"]

# if __name__ == "__main__":
#     access_token = input("Access Token: ")
#     student_id = get_student_id(access_token)
#     print(student_id)
