# Original schematic geometry; CC0 1.0. No third-party model input.
from pathlib import Path
import struct,json
def glb(kind):
 vertices=[]
 def box(cx,cy,cz,x,y,z):
  pts=[(cx+a*x/2,cy+b*y/2,cz+c*z/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
  for face in [(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(1,5,6,2),(0,3,7,4)]:
   for i in [0,1,2,0,2,3]:vertices.extend(pts[face[i]])
 if kind=='parthenon':
  box(0,0,0,5,.3,3);box(0,2.6,0,5,.3,3)
  for x in [-2,-1.2,-.4,.4,1.2,2]:
   for z in [-1,1]:box(x,1.3,z,.22,2.5,.22)
 else:
  box(0,1,0,3,2,1.5)
  for x,z,h in [(-1.6,-.9,3),(1.6,-.9,3.6),(-1.6,.9,2.8),(1.6,.9,3.2)]:box(x,h/2,z,.6,h,.6);box(x,h+.25,z,.8,.5,.8)
 data=struct.pack('<'+'f'*len(vertices),*vertices)
 mins=[min(vertices[i::3]) for i in range(3)]; maxs=[max(vertices[i::3]) for i in range(3)]
 doc={'asset':{'version':'2.0','generator':'Original geometric model by code, 2026-10-04'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0}],'meshes':[{'primitives':[{'attributes':{'POSITION':0},'material':0}]}],'materials':[{'pbrMetallicRoughness':{'baseColorFactor':[.74,.65,.48,1],'metallicFactor':0,'roughnessFactor':1},'doubleSided':True}],'buffers':[{'byteLength':len(data)}],'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(data),'target':34962}],'accessors':[{'bufferView':0,'componentType':5126,'count':len(vertices)//3,'type':'VEC3','min':mins,'max':maxs}]}
 j=json.dumps(doc,separators=(',',':')).encode();j+=b' ' *((-len(j))%4)
 return struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(data))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(data),b'BIN\x00')+data

for name in ["neuschwanstein", "parthenon"]:
    (Path(__file__).resolve().parents[1] / "public/models/monuments" / (name + ".glb")).write_bytes(glb(name))
