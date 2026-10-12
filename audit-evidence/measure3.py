from PIL import Image
S=1120/340.0
def rows(p, cx_px, tol=14, half=40):
    im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
    t=(44,50,56)
    out=[]
    for y in range(H):
        c=0
        for x in range(cx_px-half, cx_px+half):
            if 0<=x<W and all(abs(px[x,y][i]-t[i])<=tol for i in range(3)): c+=1
        if c>=3: out.append(y)
    return out
for p,d in [('contact_low.png',108),('contact_high.png',189)]:
    r=rows(p, int((330-250)*S))
    print(p,'d=',d,'tire rows screen',r[0],r[-1],'-> svg bottom',round(r[-1]/S+380,2))
