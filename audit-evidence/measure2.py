from PIL import Image
import sys, math
def wheel_bottom(p, cx_px, tol=14):
    im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
    target=(44,50,56)
    def ok(c): return all(abs(c[i]-target[i])<=tol for i in range(3))
    rows=[]
    for y in range(H):
        cnt=0
        for x in range(cx_px-30, cx_px+30):
            if 0<=x<W and ok(px[x,y]): cnt+=1
        if cnt>=3: rows.append(y)
    return (rows[0],rows[-1]) if rows else None
# full frames: scale 1120/960
S=1120/960
for p,d in [('d_0.png',0),('d_253.png',253),('d_506.png',506),('d_760.png',760),('d_1013.png',1013),('full_speed420.png',300)]:
    wb=wheel_bottom(p, int(330*S))
    print(p,'rearwheel rows',wb, 'svgBottom=', None if not wb else round(wb[1]/S,2))
