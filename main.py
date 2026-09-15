import random
import time
from fastapi import FastAPI, Form, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI()
templates = Jinja2Templates(directory="src")
app.mount("/src", StaticFiles(directory="src"), name="src")

board = []
game_status = "playing"
start_time = 0.0
clear_time = 0.0

@app.get("/")
def home_page(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.post("/init")
def init_game(size: int = Form(...)):
    global board, game_status, start_time, clear_time

    game_status = "playing"
    start_time = time.time()
    clear_time = 0.0

    mine_count = int((size * size) * 0.15)
    board = [[[0, False, False, False] for _ in range(size)] for _ in range(size)]

    placed = 0
    while placed < mine_count:
        x = random.randint(0, size - 1)
        y = random.randint(0, size - 1)
        if not board[y][x][2]:
            board[y][x][2] = True
            placed += 1

    for y in range(size):
        for x in range(size):
            if board[y][x][2]:
                continue
            count = 0
            for dy in [-1, 0, 1]:
                for dx in [-1, 0, 1]:
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < size and 0 <= nx < size:
                        if board[ny][nx][2]:
                            count += 1
            board[y][x][0] = count

    return RedirectResponse(url="/game", status_code=303)

@app.get("/game")
def show_board(request: Request):
    current_time = round(time.time() - start_time, 1) if game_status == "playing" else clear_time
    
    safe_total = 0
    safe_remaining = 0
    for row in board:
        for cell in row:
            if not cell[2]:
                safe_total += 1
                if not cell[1]:
                    safe_remaining += 1

    return templates.TemplateResponse(
        request=request,
        name="game.html",
        context={
            "board": board, 
            "game_status": game_status, 
            "time": current_time,
            "safe_total": safe_total,
            "safe_remaining": safe_remaining
        },
    )

def reveal_empty_cells(y: int, x: int, current_board: list):
    size = len(current_board)
    if not (0 <= y < size and 0 <= x < size):
        return
    if current_board[y][x][1] or current_board[y][x][2] or current_board[y][x][3]:
        return

    current_board[y][x][1] = True

    if current_board[y][x][0] == 0:
        for dy in [-1, 0, 1]:
            for dx in [-1, 0, 1]:
                if dy == 0 and dx == 0:
                    continue
                reveal_empty_cells(y + dy, x + dx, current_board)

@app.post("/api/click")
def api_click_cell(x: int = Form(...), y: int = Form(...), action: str = Form(...)):
    global board, game_status, clear_time

    previous_open_count = sum(1 for row in board for cell in row if cell[1])

    if game_status == "playing":
        if action == "flag":
            if not board[y][x][1]:
                board[y][x][3] = not board[y][x][3]

        elif action == "open":
            if not board[y][x][3]:
                if board[y][x][2]:
                    game_status = "gameover"
                    for ry in range(len(board)):
                        for rx in range(len(board[ry])):
                            if board[ry][rx][2]:
                                board[ry][rx][1] = True
                else:
                    reveal_empty_cells(y, x, board)

                    safe_total, safe_open = 0, 0
                    for ry in range(len(board)):
                        for rx in range(len(board[ry])):
                            if not board[ry][rx][2]:
                                safe_total += 1
                                if board[ry][rx][1]:
                                    safe_open += 1

                    if safe_total == safe_open:
                        game_status = "clear"
                        clear_time = round(time.time() - start_time, 1)

    current_open_count = sum(1 for row in board for cell in row if cell[1])
    newly_opened = current_open_count - previous_open_count

    safe_total = 0
    safe_remaining = 0
    for row in board:
        for cell in row:
            if not cell[2]:
                safe_total += 1
                if not cell[1]:
                    safe_remaining += 1

    current_time = round(time.time() - start_time, 1) if game_status == "playing" else clear_time
    
    return JSONResponse(content={
        "status": game_status, 
        "board": board, 
        "time": current_time,
        "newly_opened": newly_opened,
        "safe_remaining": safe_remaining,
        "safe_total": safe_total
    })