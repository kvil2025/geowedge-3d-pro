#!/usr/bin/env python3
"""
🏔️ GeoWedge 3D Pro - Generador Profesional de Red Estereográfica (Stereonet)
=============================================================================
Genera un estereograma geomecánico de alta resolución (DPI 300) estilo
Rocscience Dips / Allmendinger Stereonet usando Matplotlib.

Proyección: Schmidt Equal-Area (Lambert Azimuthal Lower Hemisphere)
Calcula: Polos, Grandes Círculos, Cono de Fricción (phi), Líneas de Intersección Diedras.

Uso:
    python generate_stereonet.py --output stereonet_hd.png
"""

import os
import argparse
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Polygon


def to_rad(deg):
    return np.radians(deg)


def to_deg(rad):
    return np.degrees(rad)


def project_schmidt(trend_deg, plunge_deg, R=1.0):
    """Proyección de igual área de Schmidt (Lambert Azimuthal Lower Hemisphere)."""
    t_rad = to_rad(trend_deg)
    p_rad = to_rad(plunge_deg)
    # Radio en proyección Schmidt: r = sqrt(2) * R * sin((90 - plunge) / 2)
    r = np.sqrt(2.0) * R * np.sin((np.pi / 2.0 - p_rad) / 2.0)
    x = r * np.sin(t_rad)
    y = r * np.cos(t_rad)
    return x, y


def project_pole(dip_deg, dipdir_deg, R=1.0):
    """Calcula el polo de un plano geológico (Dip, DipDir)."""
    pole_trend = (dipdir_deg + 180.0) % 360.0
    pole_plunge = 90.0 - dip_deg
    return project_schmidt(pole_trend, pole_plunge, R)


def calculate_great_circle(dip_deg, dipdir_deg, R=1.0, num_pts=150):
    """Calcula los puntos del Gran Círculo (traza del plano en semiesfera inferior)."""
    if dip_deg <= 0 or dip_deg >= 90:
        return np.array([]), np.array([])

    strike = (dipdir_deg - 90.0) % 360.0
    rad_strike = to_rad(strike)
    rad_dip = to_rad(dip_deg)

    alphas = np.linspace(-np.pi / 2.0, np.pi / 2.0, num_pts)
    x_pts = []
    y_pts = []

    for alpha in alphas:
        # Coordenadas locales en el plano
        xl = np.cos(alpha)
        yl = np.sin(alpha) * np.cos(rad_dip)
        zl = -np.sin(alpha) * np.sin(rad_dip)  # Hacia abajo

        # Rotar por el rumbo (strike)
        gx = xl * np.cos(rad_strike) - yl * np.sin(rad_strike)
        gy = xl * np.sin(rad_strike) + yl * np.cos(rad_strike)

        r3d = np.hypot(gx, gy)
        theta = np.arctan2(gx, gy)
        plunge = np.arctan2(-zl, r3d)

        r_proj = np.sqrt(2.0) * R * np.sin((np.pi / 2.0 - plunge) / 2.0)
        px = r_proj * np.sin(theta)
        py = r_proj * np.cos(theta)
        x_pts.append(px)
        y_pts.append(py)

    return np.array(x_pts), np.array(y_pts)


def plane_normal(dip, dipdir):
    rd = to_rad(dip)
    rdir = to_rad(dipdir)
    return np.array([
        np.sin(rd) * np.sin(rdir),
        np.sin(rd) * np.cos(rdir),
        np.cos(rd)
    ])


def intersect_planes(dip1, dir1, dip2, dir2):
    n1 = plane_normal(dip1, dir1)
    n2 = plane_normal(dip2, dir2)
    line = np.cross(n1, n2)
    mag = np.linalg.norm(line)
    if mag < 1e-6:
        return None
    line = line / mag
    if line[2] > 0:
        line = -line
    plunge = to_deg(np.arcsin(-line[2]))
    trend = to_deg(np.arctan2(line[0], line[1])) % 360.0
    return trend, plunge


def plot_stereonet(j1=(65, 135), j2=(75, 225), j3=(50, 15),
                   tunnel_axis=(45, 0), friction=32.0, output_path="stereonet_hd.png", dark_mode=True):
    """Dibuja un estereograma profesional con falsilla de Schmidt completa y estilo Rocscience Dips."""
    fig, ax = plt.subplots(figsize=(9, 9), dpi=300)

    # Colores según modo
    bg_color = '#0b1120' if dark_mode else '#ffffff'
    net_grid_color = '#1e293b' if dark_mode else '#e2e8f0'
    net_spoke_color = '#334155' if dark_mode else '#cbd5e1'
    limb_color = '#64748b' if dark_mode else '#475569'
    text_color = '#f1f5f9' if dark_mode else '#0f172a'

    fig.patch.set_facecolor(bg_color)
    ax.set_facecolor(bg_color)
    R = 1.0

    # 1. Cuadrícula polar y ecuatorial de Schmidt
    for dip_angle in range(10, 90, 10):
        r_circ = np.sqrt(2.0) * R * np.sin(to_rad(dip_angle) / 2.0)
        c = Circle((0, 0), r_circ, fill=False, edgecolor=net_grid_color, linewidth=0.8, linestyle='--' if dip_angle % 30 != 0 else '-')
        ax.add_patch(c)

    for az in range(0, 360, 10):
        rad_az = to_rad(az)
        x_end = R * np.sin(rad_az)
        y_end = R * np.cos(rad_az)
        ax.plot([0, x_end], [0, y_end], color=net_spoke_color if az % 30 == 0 else net_grid_color,
                linewidth=0.9 if az % 30 == 0 else 0.5)

    # 2. Círculo Primitivo Exterior y Ticks Milimétricos
    c_prim = Circle((0, 0), R, fill=False, edgecolor=limb_color, linewidth=2.0)
    ax.add_patch(c_prim)

    for az in range(0, 360, 2):
        rad = to_rad(az)
        tick_len = 0.035 if az % 10 == 0 else (0.02 if az % 5 == 0 else 0.012)
        x1 = R * np.sin(rad)
        y1 = R * np.cos(rad)
        x2 = (R - tick_len) * np.sin(rad)
        y2 = (R - tick_len) * np.cos(rad)
        ax.plot([x1, x2], [y1, y2], color=limb_color, linewidth=1.0 if az % 10 == 0 else 0.6)

    # Letras cardinales y números de acimut
    for az in range(0, 360, 30):
        rad = to_rad(az)
        x_txt = (R + 0.075) * np.sin(rad)
        y_txt = (R + 0.075) * np.cos(rad)
        label = 'N' if az == 0 else ('E' if az == 90 else ('S' if az == 180 else ('W' if az == 270 else f'{az}°')))
        ax.text(x_txt, y_txt, label, color=text_color, fontsize=10, fontweight='bold' if az % 90 == 0 else 'normal',
                ha='center', va='center', fontfamily='sans-serif')

    # 3. Cono de Fricción (Friction Cone phi)
    r_fric = np.sqrt(2.0) * R * np.sin(to_rad(90.0 - friction) / 2.0)
    c_fric = Circle((0, 0), r_fric, fill=True, facecolor='#ef4444' if dark_mode else '#fee2e2',
                    alpha=0.15, edgecolor='#ef4444', linewidth=1.5, linestyle=':', label=f'Cono Fricción (φ={friction:.0f}°)')
    ax.add_patch(c_fric)

    # 4. Trazas de Planos (Grandes Círculos)
    joints = [
        ('J1 (Falla Principal)', j1[0], j1[1], '#38bdf8'),
        ('J2 (Diaclasa A)', j2[0], j2[1], '#34d399'),
        ('J3 (Diaclasa B)', j3[0], j3[1], '#fbbf24')
    ]

    for label, dip, dipdir, color in joints:
        gx, gy = calculate_great_circle(dip, dipdir, R)
        if len(gx) > 0:
            ax.plot(gx, gy, color=color, linewidth=2.2, label=f'{label}: {dip:.0f}°/{int(dipdir):03d}°')
        px, py = project_pole(dip, dipdir, R)
        ax.scatter([px], [py], s=65, color=color, edgecolor='#ffffff', linewidth=1.2, zorder=5)
        ax.text(px + 0.035, py + 0.035, f'P_{label[:2]}', color=color, fontsize=9, fontweight='bold', fontfamily='monospace')

    # 5. Eje de Excavación (Túnel / Pique)
    tx, ty = project_schmidt(tunnel_axis[0], tunnel_axis[1], R)
    ax.scatter([tx], [ty], s=110, marker='s', color='#ec4899', edgecolor='#ffffff', linewidth=1.5,
               zorder=6, label=f'Eje Túnel ({tunnel_axis[0]}°/{tunnel_axis[1]}°)')
    ax.text(tx + 0.04, ty - 0.04, 'Eje Túnel', color='#ec4899', fontsize=9, fontweight='bold')

    # 6. Líneas de Intersección Diedras (Modos Cinemáticos)
    inters = [
        ('I12 (J1-J2)', intersect_planes(j1[0], j1[1], j2[0], j2[1]), '#a855f7'),
        ('I23 (J2-J3)', intersect_planes(j2[0], j2[1], j3[0], j3[1]), '#06b6d4'),
        ('I31 (J3-J1)', intersect_planes(j3[0], j3[1], j1[0], j1[1]), '#f43f5e')
    ]

    for label, inter, color in inters:
        if inter is not None:
            itrend, iplunge = inter
            ix, iy = project_schmidt(itrend, iplunge, R)
            is_critical = iplunge > friction
            status_txt = "CRÍTICO" if is_critical else "Seguro"
            ax.scatter([ix], [iy], s=100, marker='D', color=color, edgecolor='#ffffff', linewidth=1.5,
                       zorder=7, label=f'{label}: {itrend:.0f}°/{iplunge:.0f}° [{status_txt}]')
            ax.text(ix + 0.04, iy + 0.02, f'{label[:3]}', color=color, fontsize=9, fontweight='bold', fontfamily='monospace')

    # Formato general y leyenda profesional
    ax.set_xlim(-1.25, 1.25)
    ax.set_ylim(-1.25, 1.25)
    ax.set_aspect('equal')
    ax.axis('off')

    # Título técnico
    ax.text(0, 1.18, "PROYECCIÓN ESTEREOGRÁFICA DE CUÑAS (SCHMIDT)",
            color=text_color, fontsize=13, fontweight='bold', ha='center')
    ax.text(0, 1.12, "Semisfera Inferior • Block Theory Goodman & Shi • Geologgia Ltda",
            color='#94a3b8' if dark_mode else '#64748b', fontsize=9, ha='center')

    # Leyenda geomecánica tipo Rocscience Dips
    leg = ax.legend(loc='lower center', bbox_to_anchor=(0.5, -0.22), ncol=2,
                    frameon=True, facecolor='#0f172a' if dark_mode else '#f8fafc',
                    edgecolor='#334155' if dark_mode else '#cbd5e1', fontsize=8.5)
    for text in leg.get_texts():
        text.set_color(text_color)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    plt.close()
    print(f"✅ Estereograma HD guardado exitosamente en: {output_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Genera estereograma geomecánico HD")
    parser.add_argument("--output", type=str, default="stereonet_hd.png", help="Ruta archivo de salida")
    parser.add_argument("--j1-dip", type=float, default=65.0)
    parser.add_argument("--j1-dir", type=float, default=135.0)
    parser.add_argument("--j2-dip", type=float, default=75.0)
    parser.add_argument("--j2-dir", type=float, default=225.0)
    parser.add_argument("--j3-dip", type=float, default=50.0)
    parser.add_argument("--j3-dir", type=float, default=15.0)
    parser.add_argument("--trend", type=float, default=45.0)
    parser.add_argument("--plunge", type=float, default=0.0)
    parser.add_argument("--friction", type=float, default=32.0)
    parser.add_argument("--light", action="store_true", help="Modo claro")

    args = parser.parse_args()
    plot_stereonet(
        j1=(args.j1_dip, args.j1_dir),
        j2=(args.j2_dip, args.j2_dir),
        j3=(args.j3_dip, args.j3_dir),
        tunnel_axis=(args.trend, args.plunge),
        friction=args.friction,
        output_path=args.output,
        dark_mode=not args.light
    )
