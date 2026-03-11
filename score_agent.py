import getpass
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI

from langgraph.checkpoint.memory import InMemorySaver

from login_student import login
from lop_hoc_phan_student import get_lop_hoc_phan_id
from score_detail_student import get_score_detail
from info_student import get_student_id
from score_student import get_scores

load_dotenv()
checkpointer = InMemorySaver()
username = input("Username: ")
password = getpass.getpass("Password: ")


@tool
def score_tool() -> str:
    """Lấy bảng điểm tổng quát của sinh viên."""
    access_token = login(username, password)
    student_id = get_student_id(access_token)
    scores = get_scores(access_token, student_id)
    return str(scores)


@tool
def score_detail_tool(ten_mon_hoc: str, idDot: int) -> str:
    """Lấy chi tiết điểm của một môn học theo tên môn và id đợt."""
    access_token = login(username, password)
    student_id = get_student_id(access_token)

    lop_hoc_phan_id = get_lop_hoc_phan_id(
        access_token,
        student_id,
        ten_mon_hoc,
        idDot,
    )

    score_detail = get_score_detail(access_token, student_id, lop_hoc_phan_id)
    return str(score_detail)


llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0
)

agent = create_agent(
    llm,
    tools=[score_tool, score_detail_tool],
    system_prompt="""
Bạn là trợ lý tiếng Việt hỗ trợ sinh viên tra cứu điểm học tập.

NHIỆM VỤ CHÍNH
- Hỗ trợ người dùng xem bảng điểm tổng quát.
- Hỗ trợ xem chi tiết điểm của một môn học cụ thể theo đúng đợt học / đợt điểm.

QUY TẮC DÙNG TOOL
1. Nếu người dùng hỏi chung về điểm, bảng điểm, kết quả học tập, GPA, điểm các môn:
   - Dùng tool `score_tool`.

2. Nếu người dùng hỏi chi tiết một môn học cụ thể:
   - Ưu tiên dùng `score_tool` trước để lấy danh sách môn học.
   - Từ dữ liệu đó, xác định chính xác:
     + `ten_mon_hoc`
     + `idDot` (đây là mã đợt như 291, 292, 298..., không phải số thứ tự 0, 1, 2)
   - Chỉ gọi `score_detail_tool` khi đã xác định đúng 2 giá trị trên từ dữ liệu thật.

QUY TẮC CHUẨN HÓA TÊN MÔN HỌC
- Hiểu tên môn theo cách người dùng nói tự nhiên.
- Chấp nhận khác biệt về:
  + viết hoa / viết thường
  + có dấu / không dấu
  + thừa thiếu khoảng trắng
  + cách viết gần đúng
- Luôn ưu tiên tên môn chính xác từ dữ liệu `score_tool`.
- Không tự bịa tên môn hoặc idDot.

QUY TẮC TRẢ LỜI
- Luôn trả lời bằng tiếng Việt, rõ ràng, lịch sự.
- Không bịa dữ liệu.
- Nếu chưa đủ thông tin để gọi `score_detail_tool`, hãy hỏi lại thật ngắn gọn.
- Trình bày kết quả dễ đọc.
""",
)

while True:
    q = input("\nBạn: ").strip()
    if q.lower() in {"exit", "quit"}:
        break

    result = agent.invoke({"messages": [{"role": "user", "content": q}]})
    msg = result["messages"][-1].content
    text = msg if isinstance(msg, str) else msg[0].get("text", "")
    print("Bot:", text) 
    # print("Bot:", result)