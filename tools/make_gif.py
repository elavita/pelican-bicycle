import concurrent.futures
import os
import subprocess
import time

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FFMPEG = r"C:\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe"
BASE_DIR = r"C:\new\deepseek-harness\workspace\鹈鹕骑自行车动画_20261011"
FRAMES_DIR = os.path.join(BASE_DIR, "_frames")
HTML_URL = f"file:///{BASE_DIR.replace(chr(92), '/')}/pelican-bicycle.html?bare=1&paused=1"

os.makedirs(FRAMES_DIR, exist_ok=True)

# 2个曲柄周期 = 2.6 * 2 * PI * 62 * 2 = 2025.592736 px
CRANK_PERIOD = 2.6 * 2 * 3.141592653589793 * 62
TOTAL_DIST = CRANK_PERIOD * 2
TOTAL_FRAMES = 60  # 60帧，24fps播放，循环时间 2.5s

def render_frame(i):
    dist = (i / TOTAL_FRAMES) * TOTAL_DIST
    # 眨眼控制：前1.5秒不眨眼，在第2秒眨一次眼或者保持眼睛睁大
    # state.blinkAt 设为一个很大的值避免随机眨眼干扰循环平滑度，或者在固定相位眨眼
    # 这里我们让眨眼保持睁开 (t=0, blinkAt=100) 以保证首尾 100% 完美无缝闭合
    url = f"{HTML_URL}&dist={dist:.3f}&t=0"
    out_png = os.path.join(FRAMES_DIR, f"frame_{i:03d}.png")
    
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        f"--screenshot={out_png}",
        "--window-size=960,540",
        url
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return i

def main():
    print(f"开始并行渲染 {TOTAL_FRAMES} 帧...")
    t0 = time.time()
    
    # 4个工作进程并发
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(render_frame, i) for i in range(TOTAL_FRAMES)]
        for f in concurrent.futures.as_completed(futures):
            idx = f.result()
            print(f"帧 {idx:02d} 完成")

    print(f"所有帧渲染完毕，耗时 {time.time() - t0:.2f} 秒！")
    
    # 生成高质量 GIF (全景完整版 960x540)
    out_gif = os.path.join(BASE_DIR, "pelican-bicycle.gif")
    palette = os.path.join(FRAMES_DIR, "palette.png")
    
    print("生成调色板 (palettegen)...")
    subprocess.run([
        FFMPEG, "-y",
        "-framerate", "24",
        "-i", os.path.join(FRAMES_DIR, "frame_%03d.png"),
        "-vf", "palettegen=stats_mode=diff",
        palette
    ], check=True)
    
    print("应用调色板生成高质量 GIF...")
    subprocess.run([
        FFMPEG, "-y",
        "-framerate", "24",
        "-i", os.path.join(FRAMES_DIR, "frame_%03d.png"),
        "-i", palette,
        "-lavfi", "paletteuse=dither=bayer:bayer_scale=3",
        out_gif
    ], check=True)
    
    size_mb = os.path.getsize(out_gif) / (1024 * 1024)
    print(f"GIF 生成成功: {out_gif} ({size_mb:.2f} MB)")

    # 另外生成一个聚焦主体版 (只截取鹈鹕和自行车的特写，去除上下大片空白)
    # 鹈鹕主体大约在 x: 120~780, y: 80~480 (660x400)
    out_focus_gif = os.path.join(BASE_DIR, "pelican-bicycle-focus.gif")
    palette_focus = os.path.join(FRAMES_DIR, "palette_focus.png")
    
    print("生成主体特写版 GIF...")
    # crop: 宽度 740, 高度 460, x偏移 110, y偏移 50
    subprocess.run([
        FFMPEG, "-y",
        "-framerate", "24",
        "-i", os.path.join(FRAMES_DIR, "frame_%03d.png"),
        "-vf", "crop=740:460:110:50,palettegen=stats_mode=diff",
        palette_focus
    ], check=True)
    
    subprocess.run([
        FFMPEG, "-y",
        "-framerate", "24",
        "-i", os.path.join(FRAMES_DIR, "frame_%03d.png"),
        "-i", palette_focus,
        "-lavfi", "crop=740:460:110:50 [cropped]; [cropped][1:v] paletteuse=dither=bayer:bayer_scale=3",
        out_focus_gif
    ], check=True)

    focus_size_mb = os.path.getsize(out_focus_gif) / (1024 * 1024)
    print(f"主体特写 GIF 生成成功: {out_focus_gif} ({focus_size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
