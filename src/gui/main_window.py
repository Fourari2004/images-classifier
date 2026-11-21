import os
import tkinter as tk
import customtkinter as ctk
from tkinter import filedialog
from typing import Dict, Any

from src.config import config

class MainWindow(ctk.CTkFrame):
    def __init__(self, parent: ctk.CTkFrame, app_root: Any):
        super().__init__(parent, fg_color="transparent")
        self.app = app_root
        
        self.selected_folder = ""
        self.selected_output_folder = str(config.output_dir)
        
        # Grid Layout
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(3, weight=1) # Log box takes all remaining height
        
        # --- Row 0: Folder Selection Panel ---
        self.folder_frame = ctk.CTkFrame(self)
        self.folder_frame.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="ew")
        self.folder_frame.grid_columnconfigure(1, weight=1)

        # --- Source Folder ---
        self.select_folder_btn = ctk.CTkButton(
            self.folder_frame, 
            text="📂  Dossier source", 
            command=self.select_directory
        )
        self.select_folder_btn.grid(row=0, column=0, padx=15, pady=(15, 5))
        
        self.folder_label = ctk.CTkLabel(
            self.folder_frame, 
            text="Aucun dossier source sélectionné", 
            anchor="w",
            text_color="gray60"
        )
        self.folder_label.grid(row=0, column=1, padx=15, pady=(15, 5), sticky="ew")

        # --- Output Folder ---
        self.select_output_btn = ctk.CTkButton(
            self.folder_frame,
            text="💾  Dossier de sortie",
            command=self.select_output_directory,
            fg_color=("gray70", "gray30"),
            hover_color=("gray60", "gray40"),
        )
        self.select_output_btn.grid(row=1, column=0, padx=15, pady=(5, 15))

        self.output_label = ctk.CTkLabel(
            self.folder_frame,
            text=self.selected_output_folder,
            anchor="w",
            text_color=("gray10", "gray90")
        )
        self.output_label.grid(row=1, column=1, padx=15, pady=(5, 15), sticky="ew")
        
        # --- Row 1: Action Controls Panel ---
        self.controls_frame = ctk.CTkFrame(self)
        self.controls_frame.grid(row=1, column=0, padx=20, pady=10, sticky="ew")
        
        self.start_btn = ctk.CTkButton(
            self.controls_frame, 
            text="Lancer analyse", 
            state="disabled",
            command=self.start_analysis
        )
        self.start_btn.grid(row=0, column=0, padx=15, pady=15)
        
        self.pause_btn = ctk.CTkButton(
            self.controls_frame, 
            text="Pause", 
            state="disabled",
            fg_color="gray40",
            hover_color="gray50",
            command=self.pause_analysis
        )
        self.pause_btn.grid(row=0, column=1, padx=15, pady=15)
        
        self.resume_btn = ctk.CTkButton(
            self.controls_frame, 
            text="Continuer", 
            state="disabled",
            fg_color="gray40",
            hover_color="gray50",
            command=self.resume_analysis
        )
        self.resume_btn.grid(row=0, column=2, padx=15, pady=15)
        
        self.cancel_btn = ctk.CTkButton(
            self.controls_frame, 
            text="Annuler", 
            state="disabled",
            fg_color="#D32F2F",
            hover_color="#C62828",
            command=self.cancel_analysis
        )
        self.cancel_btn.grid(row=0, column=3, padx=15, pady=15)
        
        # --- Row 2: Progress & Stats Panel ---
        self.progress_frame = ctk.CTkFrame(self)
        self.progress_frame.grid(row=2, column=0, padx=20, pady=10, sticky="ew")
        self.progress_frame.grid_columnconfigure(0, weight=1)
        
        # Top line: progress bar and percentage
        self.progress_bar = ctk.CTkProgressBar(self.progress_frame)
        self.progress_bar.grid(row=0, column=0, padx=(15, 10), pady=15, sticky="ew")
        self.progress_bar.set(0.0)
        
        self.pct_label = ctk.CTkLabel(
            self.progress_frame, 
            text="0%", 
            font=ctk.CTkFont(weight="bold")
        )
        self.pct_label.grid(row=0, column=1, padx=(5, 15), pady=15)
        
        # Current path display
        self.current_img_label = ctk.CTkLabel(
            self.progress_frame, 
            text="Prêt à lancer l'analyse...", 
            anchor="w",
            font=ctk.CTkFont(size=11),
            text_color="gray50"
        )
        self.current_img_label.grid(row=1, column=0, columnspan=2, padx=15, pady=(0, 10), sticky="ew")
        
        # Bottom grid line for numerical metrics
        self.stats_grid = ctk.CTkFrame(self.progress_frame, fg_color="transparent")
        self.stats_grid.grid(row=2, column=0, columnspan=2, padx=15, pady=(0, 15), sticky="ew")
        for i in range(4):
            self.stats_grid.grid_columnconfigure(i, weight=1)
            
        self.metric_img = self._create_stat_widget(self.stats_grid, "Images analysées", "0 / 0", 0)
        self.metric_face = self._create_stat_widget(self.stats_grid, "Visages détectés", "0", 1)
        self.metric_person = self._create_stat_widget(self.stats_grid, "Personnes identifiées", "0", 2)
        self.metric_time = self._create_stat_widget(self.stats_grid, "Temps restant", "00:00:00", 3)
        
        # --- Row 3: Live Log Journal Box ---
        self.log_container = ctk.CTkFrame(self)
        self.log_container.grid(row=3, column=0, padx=20, pady=(10, 20), sticky="nsew")
        self.log_container.grid_rowconfigure(1, weight=1)
        self.log_container.grid_columnconfigure(0, weight=1)
        
        self.log_title = ctk.CTkLabel(
            self.log_container, 
            text="Journal de traitement temps réel", 
            font=ctk.CTkFont(weight="bold")
        )
        self.log_title.grid(row=0, column=0, padx=15, pady=(10, 5), sticky="w")
        
        self.log_box = ctk.CTkTextbox(
            self.log_container, 
            font=ctk.CTkFont(family="Consolas", size=11),
            state="disabled",
            text_color="#A9B7C6",
            fg_color="#1E1E1E"
        )
        self.log_box.grid(row=1, column=0, padx=15, pady=(0, 15), sticky="nsew")
        
        # Configure callbacks in app's organizer pipeline
        self.app.pipeline.progress_callback = self.update_pipeline_progress
        self.app.pipeline.log_callback = self.append_log

        # Pre-fill source folder from config.default_input_dir if set
        if config.default_input_dir and config.default_input_dir.exists():
            self.selected_folder = str(config.default_input_dir)
            self.folder_label.configure(
                text=self.selected_folder,
                text_color=("gray10", "gray90")
            )
            self.start_btn.configure(state="normal")
            self.append_log(f"Dossier source par défaut : {self.selected_folder}")

    def _create_stat_widget(self, parent: ctk.CTkFrame, label_text: str, val_text: str, col: int) -> ctk.CTkLabel:
        container = ctk.CTkFrame(parent, fg_color=("gray90", "gray20"))
        container.grid(row=0, column=col, padx=5, sticky="ew")
        
        lbl = ctk.CTkLabel(container, text=label_text, font=ctk.CTkFont(size=11), text_color="gray50")
        lbl.pack(padx=10, pady=(5, 0))
        
        val_lbl = ctk.CTkLabel(container, text=val_text, font=ctk.CTkFont(size=16, weight="bold"))
        val_lbl.pack(padx=10, pady=(0, 5))
        return val_lbl

    def select_directory(self):
        # Open dialog pre-positioned in default_input_dir if it exists
        initial = str(config.default_input_dir) \
            if config.default_input_dir and config.default_input_dir.exists() \
            else os.path.expanduser("~")
        folder = filedialog.askdirectory(
            title="Sélectionner le dossier source contenant les photos",
            initialdir=initial
        )
        if folder:
            self.selected_folder = os.path.normpath(folder)
            self.folder_label.configure(text=self.selected_folder, text_color=("gray10", "gray90"))
            self.start_btn.configure(state="normal")
            self.append_log(f"Dossier source sélectionné: {self.selected_folder}")

    def select_output_directory(self):
        """Allows the user to choose the output folder (e.g. on Google Drive)."""
        initial = self.selected_output_folder if os.path.isdir(self.selected_output_folder) \
            else os.path.expanduser("~")
        folder = filedialog.askdirectory(
            title="Sélectionner le dossier de sortie (ex: Google Drive)",
            initialdir=initial
        )
        if folder:
            self.selected_output_folder = os.path.normpath(folder)
            self.output_label.configure(text=self.selected_output_folder)
            # Update the ImageManager output directory dynamically
            from pathlib import Path
            self.app.img_mgr.output_dir = Path(self.selected_output_folder)
            self.app.img_mgr.output_dir.mkdir(parents=True, exist_ok=True)
            self.append_log(f"Dossier de sortie défini : {self.selected_output_folder}")

    def start_analysis(self):
        if not self.selected_folder:
            return
            
        self.select_folder_btn.configure(state="disabled")
        self.start_btn.configure(state="disabled")
        self.pause_btn.configure(state="normal", fg_color="#1F6AA5", hover_color="#144870")
        self.resume_btn.configure(state="disabled", fg_color="gray40")
        self.cancel_btn.configure(state="normal")
        
        # Clear logs listbox
        self.log_box.configure(state="normal")
        self.log_box.delete("1.0", tk.END)
        self.log_box.configure(state="disabled")
        
        self.app.pipeline.start_analysis(self.selected_folder)

    def pause_analysis(self):
        self.app.pipeline.pause()
        self.pause_btn.configure(state="disabled", fg_color="gray40")
        self.resume_btn.configure(state="normal", fg_color="#1F6AA5", hover_color="#144870")

    def resume_analysis(self):
        self.app.pipeline.resume()
        self.resume_btn.configure(state="disabled", fg_color="gray40")
        self.pause_btn.configure(state="normal", fg_color="#1F6AA5", hover_color="#144870")

    def cancel_analysis(self):
        self.app.pipeline.cancel()
        self.reset_controls()

    def reset_controls(self):
        self.select_folder_btn.configure(state="normal")
        self.start_btn.configure(state="normal")
        self.pause_btn.configure(state="disabled", fg_color="gray40")
        self.resume_btn.configure(state="disabled", fg_color="gray40")
        self.cancel_btn.configure(state="disabled")
        self.current_img_label.configure(text="Prêt à lancer l'analyse...")

    def append_log(self, text: str):
        # We need this to be thread safe since the pipeline runs in background
        self.log_box.configure(state="normal")
        self.log_box.insert(tk.END, text + "\n")
        self.log_box.see(tk.END)
        self.log_box.configure(state="disabled")

    def update_pipeline_progress(self, stats: Dict[str, Any]):
        # Schedule updates on the main thread via Tkinter's queue/after to keep UI responsive and safe
        self.after(0, self._set_ui_metrics, stats)

    def _set_ui_metrics(self, stats: Dict[str, Any]):
        # Total files and processed files
        processed = stats['processed_images']
        total = stats['total_images']
        
        # Percentage
        pct = 0.0
        if total > 0:
            pct = processed / total
            
        self.progress_bar.set(pct)
        self.pct_label.configure(text=f"{int(pct * 100)}%")
        
        # Current image
        curr_path = stats['current_image_path']
        if curr_path:
            self.current_img_label.configure(text=f"Traitement en cours: {os.path.basename(curr_path)}")
        
        # Numerical metrics
        self.metric_img.configure(text=f"{processed} / {total}")
        self.metric_face.configure(text=str(stats['detected_faces']))
        self.metric_person.configure(text=str(stats['total_persons']))
        
        # Remaining time
        rem_sec = stats['estimated_remaining_time']
        if not self.app.pipeline.is_running:
            self.metric_time.configure(text="--:--:--")
            self.reset_controls()
        elif rem_sec > 0:
            # Format to HH:MM:SS
            hours, remainder = divmod(int(rem_sec), 3600)
            minutes, seconds = divmod(remainder, 60)
            self.metric_time.configure(text=f"{hours:02d}:{minutes:02d}:{seconds:02d}")
        else:
            self.metric_time.configure(text="00:00:00")
