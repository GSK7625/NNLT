import requests
import unicodedata

get_score_url = "https://sinhvien.huce.edu.vn/AppSVGV/api/v1/SinhVien/KetQuaHocTap?"


def normalize_text(text):
    text = text.strip().lower()
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def get_lop_hoc_phan_id(access_token, student_id, ten_mon_hoc, idDot):
    payload = {"idSinhVien": student_id}
    headers = {
        "accept": "application/json",
        "authorization": f"Bearer {access_token}",
        "language": "vi",
        "user-agent": "Dart/3.0 (dart:io)"
    }

    response = requests.post(get_score_url, json=payload, headers=headers)
    response.raise_for_status()

    tong_ket_hoc_kys = response.json()["result"]["tongKetHocKys"]

    for dot in tong_ket_hoc_kys:
        if dot["idDot"] == idDot:
            for mon in dot["chiTiets"]:
                if normalize_text(mon["tenMonHoc"]) == normalize_text(ten_mon_hoc):
                    return mon["idLopHocPhan"]

    raise ValueError(f"Không tìm thấy môn '{ten_mon_hoc}' với idDot={idDot}")

# if __name__ == "__main__":
#     access_token = input("Access Token: ")
#     student_id = input("Student ID: ")
#     ten_mon_hoc = input("Tên môn học: ")
#     idDot = int(input("ID Đợt: "))
#     lop_hoc_phan_id = get_lop_hoc_phan_id(access_token, student_id, ten_mon_hoc, idDot)
#     print(f"LopHocPhan_id: {lop_hoc_phan_id}")