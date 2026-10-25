"""
GeoWedge - Motor de Cálculo Geotécnico de Estabilidad de Cuñas Subterráneas
Soporta Múltiples Perfiles: Herradura, Medio Punto, Circular, Rectangular y Pique Vertical
Basado en Teoría de Bloques (Goodman & Shi, 1985) y Equilibrio Límite 3D
"""

import numpy as np
import math

def generate_tunnel_profile(shape='horseshoe', width=5.0, height=4.5, num_pts=24):
    """
    Genera los vértices 2D normalizados del perfil de excavación.
    Retorna lista de pares (x, y).
    """
    w2 = width / 2.0
    pts = []
    
    if shape == 'circular':
        # Círculo perfecto (TBM o Pique Circular)
        r = min(w2, height / 2.0)
        cy = height / 2.0
        for i in range(num_pts):
            theta = 2 * math.pi * i / num_pts
            pts.append((r * math.cos(theta), cy + r * math.sin(theta)))
            
    elif shape == 'arch':
        # Medio Punto / Bóveda semicircular con hastiales rectos
        r = w2
        spring_y = max(0.5, height - r) # inicio del arco
        pts.append((-w2, 0.0))
        pts.append((w2, 0.0))
        pts.append((w2, spring_y))
        # Arco semicircular superior
        arc_pts = num_pts // 2
        for i in range(arc_pts + 1):
            theta = math.pi * i / arc_pts
            pts.append((r * math.cos(theta), spring_y + r * math.sin(theta)))
        pts.append((-w2, spring_y))
        
    elif shape == 'rectangular':
        # Rectangular / Caja / Tajeo minero
        pts = [(-w2, 0.0), (w2, 0.0), (w2, height), (-w2, height)]
        
    elif shape == 'shaft':
        # Pique Vertical cilíndrico (plunge = 90°)
        r = min(w2, height / 2.0)
        for i in range(num_pts):
            theta = 2 * math.pi * i / num_pts
            pts.append((r * math.cos(theta), r * math.sin(theta)))
            
    else: # horseshoe por defecto
        # Herradura clásica con bóveda rebajada
        spring_y = height * 0.6
        pts.append((-w2, 0.0))
        pts.append((w2, 0.0))
        pts.append((w2, spring_y))
        pts.append((w2 * 0.7, height * 0.9))
        pts.append((0.0, height))
        pts.append((-w2 * 0.7, height * 0.9))
        pts.append((-w2, spring_y))
        
    return pts

def analyze_shaft_vs_tunnel(shape='horseshoe', plunge=0.0):
    """
    Verifica si se trata de un pique vertical o túnel horizontal.
    """
    is_vertical_shaft = (shape == 'shaft') or (plunge >= 80.0)
    return is_vertical_shaft

if __name__ == '__main__':
    print("=" * 70)
    print(" GENERADOR DE PERFILES GEOTÉCNICOS Y PIQUES VERTICALES")
    print("=" * 70)
    for s in ['horseshoe', 'arch', 'circular', 'rectangular', 'shaft']:
        prof = generate_tunnel_profile(s, width=5.0, height=4.5)
        print(f"Perfil: {s.upper():12} -> {len(prof)} vértices generados")
    print("=" * 70)
