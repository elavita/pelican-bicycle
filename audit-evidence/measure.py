from PIL import Image
import sys
def analyze(p, x0=0, x1=560):
    im = Image.open(p).convert('RGB')
    W,H = im.size
    px = im.load()
    # tire dark ~ (44,50,56); road light strip ~ (124,136,145)
    def dark(c): return abs(c[0]-44)<22 and abs(c[1]-50)<22 and abs(c[2]-56)<22
    def strip(c): return abs(c[0]-124)<18 and abs(c[1]-136)<18 and abs(c[2]-145)<18
    lowest=None; strip_rows=[]
    for y in range(H):
        dcnt=0; scnt=0
        for x in range(x0,x1,2):
            c=px[x,y]
            if dark(c): dcnt+=1
            if strip(c): scnt+=1
        if dcnt>3: lowest=y
        if scnt>50: strip_rows.append(y)
    return W,H,lowest,(strip_rows[0],strip_rows[-1]) if strip_rows else None
for p in sys.argv[1:]:
    print(p, analyze(p))
