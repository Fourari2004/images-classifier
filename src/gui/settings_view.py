import os
from pathlib import Path
import customtkinter as ctk
from tkinter import filedialog
from tkinter import messagebox
from typing import Any

from src.config import config

class SettingsView(ctk.CTkFrame):
    def __init__(self, parent: ctk.CTkFrame, app_root: Any):
        super().__init__(parent, fg_color="transparent")
        self.app = app_root
        
        # Grid Configuration
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1) # Scrollable settings frame fills space
        
        # Scrollable container for settings
        self.scroll = ctk.CTkScrollableFrame(self)
        self.scroll.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="nsew")
        self.scroll.grid_columnconfigure(0, weight=1)
        
        # Title
        self.title_lbl = ctk.CTkLabel(
            self.scroll, 
            text="Paramètres de configuration", 
            font=ctk.CTkFont(size=20, weight="bold")
        )
        self.title_lbl.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="w")
        
        # --- Section 1: Recognition Parameters ---
        self.sect_rec = self._create_section(self.scroll, "Reconnaissance Faciale", 1)
        
        # Similarity Threshold
        self.thresh_lbl = ctk.CTkLabel(self.sect_rec, text="Seuil de similarité (ArcFace) : 0.45", font=ctk.CTkFont(weight="bold"))
        self.thresh_lbl.grid(row=0, column=0, padx=15, pady=(15, 2), sticky="w")
        
        self.thresh_slider = ctk.CTkSlider(
            self.sect_rec, 
            from_=0.10, to=0.90, 
            number_of_steps=16,
            command=self.on_slider_change
        )
        self.thresh_slider.grid(row=1, column=0, padx=15, pady=(0, 5), sticky="ew")
        
        self.thresh_desc = ctk.CTkLabel(
            self.sect_rec, 
            text="Un seuil plus élevé réduit les faux positifs (fusion par erreur) mais peut séparer la même personne en plusieurs profils.",
            font=ctk.CTkFont(size=11),
            text_color="gray50",
            wraplength=600,
            justify="left"
        )
        self.thresh_desc.grid(row=2, column=0, padx=15, pady=(0, 15), sticky="w")
        
        # Min Face Confidence
        self.conf_lbl = ctk.CTkLabel(self.sect_rec, text="Seuil de détection minimal : 0.60", font=ctk.CTkFont(weight="bold"))
        self.conf_lbl.grid(row=3, column=0, padx=15, pady=(5, 2), sticky="w")
        
        self.conf_slider = ctk.CTkSlider(
            self.sect_rec,
            from_=0.30, to=0.95,
            number_of_steps=13,
            command=self.on_conf_slider_change
        )
        self.conf_slider.grid(row=4, column=0, padx=15, pady=(0, 5), sticky="ew")
        
        self.conf_desc = ctk.CTkLabel(
            self.sect_rec,
            text="Ignore les visages détectés avec une confiance inférieure à ce seuil (aide à filtrer les faux visages en arrière-plan).",
            font=ctk.CTkFont(size=11),
            text_color="gray50",
            wraplength=600,
            justify="left"
        )
        self.conf_desc.grid(row=5, column=0, padx=15, pady=(0, 15), sticky="w")

        # --- Section 2: Paths & Directories ---
        self.sect_paths = self._create_section(self.scroll, "Dossiers & Emplacements", 2)
        
        self.out_lbl = ctk.CTkLabel(self.sect_paths, text="Dossier d'organisation (Sortie) :", font=ctk.CTkFont(weight="bold"))
        self.out_lbl.grid(row=0, column=0, padx=15, pady=(15, 2), sticky="w")
        
        self.out_selector_frame = ctk.CTkFrame(self.sect_paths, fg_color="transparent")
        self.out_selector_frame.grid(row=1, column=0, padx=15, pady=(0, 15), sticky="ew")
        self.out_selector_frame.grid_columnconfigure(0, weight=1)
        
        self.out_path_entry = ctk.CTkEntry(self.out_selector_frame)
        self.out_path_entry.grid(row=0, column=0, padx=(0, 10), sticky="ew")
        
        self.out_browse_btn = ctk.CTkButton(
            self.out_selector_frame, 
            text="Parcourir...", 
            width=100,
            command=self.browse_output_dir
        )
        self.out_browse_btn.grid(row=0, column=1)

        # --- Section 3: Performance & CPU Optimization ---
        self.sect_perf = self._create_section(self.scroll, "Performance & Optimisation", 3)
        
        # Processing Mode
        self.mode_lbl = ctk.CTkLabel(self.sect_perf, text="Mode de traitement :", font=ctk.CTkFont(weight="bold"))
        self.mode_lbl.grid(row=0, column=0, padx=15, pady=(15, 2), sticky="w")
        
        self.mode_combo = ctk.CTkComboBox(self.sect_perf, values=["Rapide (320px)", "Équilibré (640px)", "Précision maximale (960px)"], width=250)
        self.mode_combo.grid(row=1, column=0, padx=15, pady=(0, 15), sticky="w")
        
        # Threads
        self.threads_lbl = ctk.CTkLabel(self.sect_perf, text="Nombre de threads CPU : 4", font=ctk.CTkFont(weight="bold"))
        self.threads_lbl.grid(row=2, column=0, padx=15, pady=(5, 2), sticky="w")
        
        self.threads_slider = ctk.CTkSlider(
            self.sect_perf, 
            from_=1, to=12, 
            number_of_steps=11,
            command=self.on_threads_slider_change
        )
        self.threads_slider.grid(row=3, column=0, padx=15, pady=(0, 5), sticky="ew")
        
        self.threads_desc = ctk.CTkLabel(
            self.sect_perf, 
            text="Régule l'utilisation du processeur pour le chargement d'images et les opérations vectorielles.",
            font=ctk.CTkFont(size=11),
            text_color="gray50",
            wraplength=600,
            justify="left"
        )
        self.threads_desc.grid(row=4, column=0, padx=15, pady=(0, 15), sticky="w")
        
        # --- Save Button at the Bottom ---
        self.save_btn = ctk.CTkButton(
            self, 
            text="Enregistrer les modifications", 
            height=40,
            command=self.save_settings
        )
        self.save_btn.grid(row=1, column=0, padx=20, pady=20, sticky="ew")
        
        # Load values
        self.load_settings_values()

    def _create_section(self, parent: ctk.CTkFrame, title: str, row: int) -> ctk.CTkFrame:
        sect = ctk.CTkFrame(parent)
        sect.grid(row=row, column=0, padx=20, pady=10, sticky="ew")
        sect.grid_columnconfigure(0, weight=1)
        
        title_lbl = ctk.CTkLabel(sect, text=title, font=ctk.CTkFont(size=14, weight="bold"), text_color="#1F6AA5")
        title_lbl.grid(row=0, column=0, padx=15, pady=(10, 0), sticky="w")
        
        # Nested container for content
        content = ctk.CTkFrame(sect, fg_color="transparent")
        content.grid(row=1, column=0, sticky="ew")
        content.grid_columnconfigure(0, weight=1)
        return content

    def load_settings_values(self):
        # Threshold slider
        thresh = config.recognition_threshold
        self.thresh_slider.set(thresh)
        self.thresh_lbl.configure(text=f"Seuil de similarité (ArcFace) : {thresh:.2f}")
        
        # Confidence slider
        conf = config.min_face_confidence
        self.conf_slider.set(conf)
        self.conf_lbl.configure(text=f"Seuil de détection minimal : {conf:.2f}")
        
        # Output directory
        self.out_path_entry.delete(0, "end")
        self.out_path_entry.insert(0, str(config.output_dir))
        
        # Mode
        mode = config.mode
        if mode == "fast":
            self.mode_combo.set("Rapide (320px)")
        elif mode == "accurate":
            self.mode_combo.set("Précision maximale (960px)")
        else:
            self.mode_combo.set("Équilibré (640px)")
            
        # Threads
        threads = config.cpu_threads
        self.threads_slider.set(threads)
        self.threads_lbl.configure(text=f"Nombre de threads CPU : {int(threads)}")

    def on_slider_change(self, val):
        self.thresh_lbl.configure(text=f"Seuil de similarité (ArcFace) : {val:.2f}")

    def on_conf_slider_change(self, val):
        self.conf_lbl.configure(text=f"Seuil de détection minimal : {val:.2f}")

    def on_threads_slider_change(self, val):
        self.threads_lbl.configure(text=f"Nombre de threads CPU : {int(val)}")

    def browse_output_dir(self):
        folder = filedialog.askdirectory(title="Choisir le dossier d'organisation de sortie")
        if folder:
            self.out_path_entry.delete(0, "end")
            self.out_path_entry.insert(0, os.path.normpath(folder))

    def save_settings(self):
        # Validate output path
        out_path = self.out_path_entry.get().strip()
        if not out_path:
            messagebox.showerror("Erreur de saisie", "Le dossier de sortie ne peut pas être vide.")
            return
            
        # Check permissions or try creating it
        try:
            os.makedirs(out_path, exist_ok=True)
        except Exception as e:
            messagebox.showerror("Erreur de dossier", f"Impossible d'utiliser le dossier sélectionné : {e}")
            return
            
        # Commit to config instance
        config.recognition_threshold = float(self.thresh_slider.get())
        config.min_face_confidence = float(self.conf_slider.get())
        config.cpu_threads = int(self.threads_slider.get())
        
        selected_mode = self.mode_combo.get()
        if "Rapide" in selected_mode:
            config.mode = "fast"
        elif "Précision" in selected_mode:
            config.mode = "accurate"
        else:
            config.mode = "balanced"
            
        # Update path — keep as Path object so ImageManager.mkdir() works
        abs_out = os.path.abspath(out_path)
        config.data["paths"]["output_dir"] = abs_out
        config.output_dir = Path(abs_out)
        
        # Save to file
        config.save()
        
        # Re-apply changes to live pipeline components
        self.app.pipeline.img_mgr.output_dir = config.output_dir
        config.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Sync recognition threshold to active pipeline recognizer if any
        if hasattr(self.app.pipeline, '_recognizer') and self.app.pipeline._recognizer:
            self.app.pipeline._recognizer.set_threshold(config.recognition_threshold)
        
        messagebox.showinfo("Paramètres sauvegardés", "Les modifications ont été enregistrées avec succès.")
