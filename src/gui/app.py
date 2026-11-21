import os
import time
import tkinter as tk
from tkinter import messagebox
import customtkinter as ctk
from pathlib import Path

from src.config import config
from src.database import Database
from src.faiss_index import FAISSIndex
from src.image_manager import ImageManager
from src.organizer import OrganizerPipeline

# Import GUI frames
from src.gui.main_window import MainWindow
from src.gui.person_view import PersonView
from src.gui.settings_view import SettingsView

class FaceOrganizerApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        # Configure window metadata
        self.title("Face Organizer AI - Local Photo Classification")
        self.geometry(f"{config.data.get('gui', {}).get('window_width', 1100)}x{config.data.get('gui', {}).get('window_height', 750)}")
        self.minsize(950, 600)
        
        # Set theme
        ctk.set_appearance_mode(config.theme)
        ctk.set_default_color_theme(config.data.get("gui", {}).get("color_theme", "blue"))
        
        # Initialize Backend Components
        self.db = Database(str(config.db_path))
        
        # Thumbnail cache folder inside database folder
        self.cache_dir = config.db_dir / "thumbnails"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.img_mgr = ImageManager(str(config.output_dir), str(self.cache_dir))
        
        self.faiss_index = FAISSIndex()
        # Initial load of FAISS index
        if not self.faiss_index.load(str(config.faiss_index_path)):
            # If fail, load from DB and rebuild
            self.rebuild_faiss_index()
            
        # Analysis Pipeline
        self.pipeline = OrganizerPipeline(
            db=self.db,
            index=self.faiss_index,
            img_mgr=self.img_mgr,
            error_callback=self.show_pipeline_error
        )
        
        # Setup GUI Grid Layout (1 row, 2 columns: Sidebar and Main Content)
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)
        
        # Sidebar Frame
        self.sidebar_frame = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(4, weight=1) # Push bottom items down
        
        # Title Label in Sidebar
        self.title_label = ctk.CTkLabel(
            self.sidebar_frame, 
            text="Face Organizer AI", 
            font=ctk.CTkFont(size=20, weight="bold")
        )
        self.title_label.grid(row=0, column=0, padx=20, pady=20)
        
        # Navigation Buttons
        self.nav_analysis_btn = ctk.CTkButton(
            self.sidebar_frame, 
            text="Analyse & Progrès", 
            fg_color="transparent", 
            text_color=("gray10", "gray90"),
            hover_color=("gray70", "gray30"),
            anchor="w",
            command=self.show_analysis_frame
        )
        self.nav_analysis_btn.grid(row=1, column=0, padx=20, pady=10, sticky="ew")
        
        self.nav_persons_btn = ctk.CTkButton(
            self.sidebar_frame, 
            text="Personnes & Galerie", 
            fg_color="transparent", 
            text_color=("gray10", "gray90"),
            hover_color=("gray70", "gray30"),
            anchor="w",
            command=self.show_persons_frame
        )
        self.nav_persons_btn.grid(row=2, column=0, padx=20, pady=10, sticky="ew")
        
        self.nav_settings_btn = ctk.CTkButton(
            self.sidebar_frame, 
            text="Paramètres", 
            fg_color="transparent", 
            text_color=("gray10", "gray90"),
            hover_color=("gray70", "gray30"),
            anchor="w",
            command=self.show_settings_frame
        )
        self.nav_settings_btn.grid(row=3, column=0, padx=20, pady=10, sticky="ew")
        
        # App Version info in Sidebar bottom
        self.version_label = ctk.CTkLabel(
            self.sidebar_frame, 
            text="v1.0.0 - Hors-ligne", 
            font=ctk.CTkFont(size=10, slant="italic"),
            text_color="gray50"
        )
        self.version_label.grid(row=5, column=0, padx=20, pady=15)
        
        # Content Frames Container (Frame switching using select_frame)
        self.content_container = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        self.content_container.grid(row=0, column=1, sticky="nsew")
        self.content_container.grid_rowconfigure(0, weight=1)
        self.content_container.grid_columnconfigure(0, weight=1)
        
        # Initialize Frames
        self.analysis_frame = MainWindow(self.content_container, self)
        self.persons_frame = PersonView(self.content_container, self)
        self.settings_frame = SettingsView(self.content_container, self)
        
        # Set default frame
        self.active_frame = None
        self.show_analysis_frame()
        
        # Handle clean window close
        self.protocol("WM_DELETE_WINDOW", self.on_close)

    def rebuild_faiss_index(self):
        """Helper to rebuild the index from database contents."""
        db_embeddings = self.db.get_all_embeddings()
        self.faiss_index.rebuild(db_embeddings)
        self.faiss_index.save(str(config.faiss_index_path))

    def show_pipeline_error(self, error_message: str):
        """
        Called from background thread when a fatal pipeline error occurs.
        Uses after() to safely show the messagebox on the main thread.
        """
        def _show():
            messagebox.showerror(
                "Erreur — Face Organizer AI",
                f"Une erreur critique a stoppé l'analyse :\n\n{error_message}\n\n"
                "Si les modèles InsightFace ne sont pas encore téléchargés,\n"
                "assurez-vous d'avoir une connexion Internet lors du premier lancement.\n"
                f"Les modèles seront téléchargés automatiquement dans :\n{config.models_dir}"
            )
        self.after(0, _show)

    def show_analysis_frame(self):
        self.select_frame(self.analysis_frame, self.nav_analysis_btn)
        
    def show_persons_frame(self):
        self.select_frame(self.persons_frame, self.nav_persons_btn)
        self.persons_frame.refresh_data() # Refresh lists when navigating

    def show_settings_frame(self):
        self.select_frame(self.settings_frame, self.nav_settings_btn)

    def select_frame(self, frame_to_show: ctk.CTkFrame, active_btn: ctk.CTkButton):
        # Hide active frame
        if self.active_frame:
            self.active_frame.grid_forget()
            
        # Reset nav button colors
        for btn in [self.nav_analysis_btn, self.nav_persons_btn, self.nav_settings_btn]:
            btn.configure(fg_color="transparent")
            
        # Show new frame
        frame_to_show.grid(row=0, column=0, sticky="nsew")
        self.active_frame = frame_to_show
        
        # Highlight active button
        active_btn.configure(fg_color=("gray80", "gray25"))

    def on_close(self):
        # Cancel the pipeline if running
        if self.pipeline.is_running:
            self.pipeline.cancel()
            # Wait briefly for worker thread to stop
            time_start = time.time()
            while self.pipeline.is_running and time.time() - time_start < 2.0:
                self.update()
                
        # Save FAISS index
        self.faiss_index.save(str(config.faiss_index_path))
        
        # Destroy window
        self.destroy()
