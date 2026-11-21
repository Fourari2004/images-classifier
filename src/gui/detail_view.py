import os
import tkinter as tk
import customtkinter as ctk
from PIL import Image, ImageTk
from typing import Dict, Any, List, Tuple, Optional
from tkinter import messagebox

class DetailView(ctk.CTkToplevel):
    def __init__(self, app_root: Any, img_item: Dict[str, Any], on_update_callback: Any):
        super().__init__()
        self.app = app_root
        self.img_item = img_item
        self.on_update = on_update_callback
        
        self.title(f"Détails de l'image - {os.path.basename(img_item['path'])}")
        self.geometry("900x580")
        self.minsize(800, 500)
        self.resizable(True, True)
        
        # Selected face index
        self.selected_face_idx: Optional[int] = None
        self.faces: List[Dict[str, Any]] = []
        
        # Grid layout (Row 0: Header, Row 1: Content with Canvas & Sidebar)
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=3) # Canvas
        self.grid_columnconfigure(1, weight=1) # Sidebar controls
        
        # Title Header
        self.header_frame = ctk.CTkFrame(self, height=50, corner_radius=0)
        self.header_frame.grid(row=0, column=0, columnspan=2, sticky="ew")
        
        self.title_lbl = ctk.CTkLabel(
            self.header_frame, 
            text=f"Fichier : {self.img_item['path']}", 
            font=ctk.CTkFont(weight="bold")
        )
        self.title_lbl.pack(padx=20, pady=10, side="left")
        
        # Canvas Frame (Left Column)
        self.canvas_frame = ctk.CTkFrame(self, fg_color="#151515")
        self.canvas_frame.grid(row=1, column=0, padx=20, pady=20, sticky="nsew")
        self.canvas_frame.grid_rowconfigure(0, weight=1)
        self.canvas_frame.grid_columnconfigure(0, weight=1)
        
        self.canvas = tk.Canvas(self.canvas_frame, bg="#151515", highlightthickness=0)
        self.canvas.grid(row=0, column=0, sticky="nsew")
        self.canvas.bind("<Configure>", self.on_canvas_resize)
        self.canvas.bind("<Button-1>", self.on_canvas_click)
        
        # Sidebar Frame (Right Column)
        self.sidebar = ctk.CTkFrame(self)
        self.sidebar.grid(row=1, column=1, padx=(0, 20), pady=20, sticky="nsew")
        self.sidebar.grid_columnconfigure(0, weight=1)
        self.sidebar.grid_rowconfigure(1, weight=1) # List fills space
        
        self.sidebar_title = ctk.CTkLabel(self.sidebar, text="Visages détectés", font=ctk.CTkFont(weight="bold"))
        self.sidebar_title.grid(row=0, column=0, padx=15, pady=15, sticky="w")
        
        # List of faces
        self.faces_scroll = ctk.CTkScrollableFrame(self.sidebar, height=180)
        self.faces_scroll.grid(row=1, column=0, padx=15, pady=(0, 10), sticky="nsew")
        self.faces_scroll.grid_columnconfigure(0, weight=1)
        
        # Selection / Reassignment Controls
        self.actions_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        self.actions_frame.grid(row=2, column=0, padx=15, pady=15, sticky="ew")
        self.actions_frame.grid_columnconfigure(0, weight=1)
        
        self.selected_face_lbl = ctk.CTkLabel(
            self.actions_frame, 
            text="Sélectionnez un visage pour le réassigner", 
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color="gray60"
        )
        self.selected_face_lbl.grid(row=0, column=0, pady=(0, 10), sticky="w")
        
        # Dropdown to reassign to existing person
        self.reassign_label = ctk.CTkLabel(self.actions_frame, text="Attribuer à :", font=ctk.CTkFont(size=11))
        self.reassign_label.grid(row=1, column=0, sticky="w")
        
        self.persons_combo = ctk.CTkComboBox(self.actions_frame, state="disabled", width=220)
        self.persons_combo.grid(row=2, column=0, pady=5, sticky="w")
        
        self.apply_btn = ctk.CTkButton(
            self.actions_frame, 
            text="Appliquer", 
            state="disabled", 
            command=self.reassign_face_to_person
        )
        self.apply_btn.grid(row=3, column=0, pady=5, sticky="ew")
        
        self.new_person_btn = ctk.CTkButton(
            self.actions_frame, 
            text="Créer une nouvelle personne", 
            state="disabled", 
            fg_color="gray45",
            hover_color="gray55",
            command=self.reassign_face_to_new_person
        )
        self.new_person_btn.grid(row=4, column=0, pady=5, sticky="ew")
        
        self.remove_btn = ctk.CTkButton(
            self.actions_frame, 
            text="Supprimer le visage", 
            state="disabled", 
            fg_color="#D32F2F",
            hover_color="#C62828",
            command=self.delete_face_link
        )
        self.remove_btn.grid(row=5, column=0, pady=(15, 0), sticky="ew")
        
        # Load image details and options
        self.load_faces()
        self.load_persons_options()
        
        # Image handles
        self.pil_image = None
        self.photo_image = None
        self.scale = 1.0
        self.offset_x = 0
        self.offset_y = 0
        
        # Initial load image
        try:
            self.pil_image = Image.open(self.img_item['path'])
        except Exception as e:
            messagebox.showerror("Erreur", f"Impossible d'ouvrir l'image originale : {e}")

    def load_faces(self):
        # Fetch faces from SQLite
        self.faces = self.app.db.get_image_persons(self.img_item['id'])
        
        # Re-populate faces listbox
        for child in self.faces_scroll.winfo_children():
            child.destroy()
            
        if not self.faces:
            no_lbl = ctk.CTkLabel(self.faces_scroll, text="Aucun visage associé", text_color="gray50")
            no_lbl.grid(row=0, column=0, pady=10)
            return

        for idx, f in enumerate(self.faces):
            box = f['face_box']
            conf = f['confidence']
            name = f['display_name']
            
            card = ctk.CTkFrame(self.faces_scroll, border_width=1, border_color="gray25")
            card.grid(row=idx, column=0, padx=2, pady=3, sticky="ew")
            
            lbl = ctk.CTkLabel(card, text=f"{name} ({int(conf*100)}%)", font=ctk.CTkFont(size=12))
            lbl.pack(padx=10, pady=8, side="left")
            
            # Click action
            card.bind("<Button-1>", lambda event, i=idx: self.select_face(i))
            lbl.bind("<Button-1>", lambda event, i=idx: self.select_face(i))
            
            if self.selected_face_idx == idx:
                card.configure(fg_color=("gray80", "gray28"), border_color=ctk.ThemeManager.theme["CTkButton"]["fg_color"])

    def load_persons_options(self):
        # Fetch all persons for dropdown re-assignment options
        self.all_persons = self.app.db.get_all_persons()
        
        # Populate list
        self.combo_options_map = {f"{p['display_name']} ({p['folder_name']})": p['id'] for p in self.all_persons}
        options = list(self.combo_options_map.keys())
        
        if options:
            self.persons_combo.configure(values=options)
            self.persons_combo.set(options[0])

    def select_face(self, index: int):
        self.selected_face_idx = index
        
        # Redraw faces listbox highlight
        self.load_faces()
        
        # Redraw canvas to highlight selected box
        self.draw_image_on_canvas()
        
        # Enable action controls
        face_info = self.faces[index]
        self.selected_face_lbl.configure(
            text=f"Visage sélectionné : {face_info['display_name']}",
            text_color=("gray10", "gray90")
        )
        self.persons_combo.configure(state="normal")
        self.apply_btn.configure(state="normal")
        self.new_person_btn.configure(state="normal")
        self.remove_btn.configure(state="normal")

    def on_canvas_resize(self, event):
        self.draw_image_on_canvas()

    def draw_image_on_canvas(self):
        if not self.pil_image:
            return
            
        # Canvas dimensions
        cw = self.canvas.winfo_width()
        ch = self.canvas.winfo_height()
        
        if cw < 10 or ch < 10:
            return
            
        # Image dimensions
        iw, ih = self.pil_image.size
        
        # Keep aspect ratio
        ratio = min(cw / iw, ch / ih)
        nw = int(iw * ratio)
        nh = int(ih * ratio)
        
        # Resize image for display
        resized = self.pil_image.resize((nw, nh), Image.Resampling.LANCZOS)
        self.photo_image = ImageTk.PhotoImage(resized)
        
        # Clear canvas
        self.canvas.delete("all")
        
        # Draw image
        self.offset_x = (cw - nw) // 2
        self.offset_y = (ch - nh) // 2
        self.canvas.create_image(self.offset_x, self.offset_y, image=self.photo_image, anchor="nw")
        
        # Store scale factor
        self.scale = ratio
        
        # Draw bounding boxes
        for idx, f in enumerate(self.faces):
            box_str = f['face_box']
            x1, y1, x2, y2 = map(int, box_str.split(","))
            
            # Map box to canvas coordinates
            cx1 = x1 * self.scale + self.offset_x
            cy1 = y1 * self.scale + self.offset_y
            cx2 = x2 * self.scale + self.offset_x
            cy2 = y2 * self.scale + self.offset_y
            
            # Highlight selected box
            is_selected = (self.selected_face_idx == idx)
            color = "#1F6AA5" if is_selected else "green"
            width = 3 if is_selected else 1.5
            
            self.canvas.create_rectangle(cx1, cy1, cx2, cy2, outline=color, width=width)
            
            # Text tag
            label_text = f"{f['display_name']} ({int(f['confidence']*100)}%)"
            self.canvas.create_text(
                cx1, cy1 - 10, 
                text=label_text, 
                fill=color, 
                anchor="sw",
                font=("Consolas", 10, "bold")
            )

    def on_canvas_click(self, event):
        # Determine if click is inside any bounding box
        x = event.x
        y = event.y
        
        best_box_idx = None
        min_area = float("inf")
        
        for idx, f in enumerate(self.faces):
            box_str = f['face_box']
            x1, y1, x2, y2 = map(int, box_str.split(","))
            
            # Canvas coordinates
            cx1 = x1 * self.scale + self.offset_x
            cy1 = y1 * self.scale + self.offset_y
            cx2 = x2 * self.scale + self.offset_x
            cy2 = y2 * self.scale + self.offset_y
            
            if cx1 <= x <= cx2 and cy1 <= y <= cy2:
                # Find smallest box that contains the point
                area = (cx2 - cx1) * (cy2 - cy1)
                if area < min_area:
                    min_area = area
                    best_box_idx = idx
                    
        if best_box_idx is not None:
            self.select_face(best_box_idx)

    def reassign_face_to_person(self):
        if self.selected_face_idx is None:
            return
            
        selected_option = self.persons_combo.get()
        target_person_id = self.combo_options_map[selected_option]
        
        face_info = self.faces[self.selected_face_idx]
        old_person_id = face_info['person_id']
        
        if old_person_id == target_person_id:
            messagebox.showinfo("Aucun changement", "Le visage appartient déjà à cette personne.")
            return

        target_person = self.app.db.get_person(target_person_id)
        old_person = self.app.db.get_person(old_person_id)
        
        try:
            # 1. Update SQLite relation
            self.app.db.reassign_face(
                self.img_item['id'], old_person_id, face_info['face_box'], 
                target_person_id, face_info['confidence']
            )
            
            # 2. Copy image physically to new folder (handles collision safely)
            self.app.img_mgr.copy_image_to_person(self.img_item['path'], target_person['folder_name'])
            
            # 3. Clean up physical copy from old person folder if no other faces of old person exist in this image
            remaining_faces = self.app.db.execute_read(
                "SELECT * FROM ImagePersons WHERE image_id = ? AND person_id = ?",
                (self.img_item['id'], old_person_id)
            )
            if not remaining_faces:
                self.app.img_mgr.remove_image_from_person(self.img_item['path'], old_person['folder_name'])
                
            # Refresh details and call gallery refresh
            self.selected_face_idx = None
            self.load_faces()
            self.draw_image_on_canvas()
            self.on_update()
            
            messagebox.showinfo("Succès", f"Visage réassigné avec succès à {target_person['display_name']}.")
        except Exception as e:
            messagebox.showerror("Erreur", f"Erreur lors de la réattribution : {e}")

    def reassign_face_to_new_person(self):
        if self.selected_face_idx is None:
            return
            
        # Creates a new person profile on the fly
        face_info = self.faces[self.selected_face_idx]
        old_person_id = face_info['person_id']
        old_person = self.app.db.get_person(old_person_id)
        
        try:
            # Rebuild index / recognizer method for new person creation
            next_num = self.app.db.get_next_person_number()
            new_folder = f"person_{next_num:04d}"
            new_display = f"Person {next_num}"
            
            # Create in SQLite
            new_person_id = self.app.db.add_person(new_display, new_folder)
            
            # Reassign face
            self.app.db.reassign_face(
                self.img_item['id'], old_person_id, face_info['face_box'],
                new_person_id, face_info['confidence']
            )
            
            # Copy to new folder
            self.app.img_mgr.copy_image_to_person(self.img_item['path'], new_folder)
            
            # Clean up old folder if necessary
            remaining_faces = self.app.db.execute_read(
                "SELECT * FROM ImagePersons WHERE image_id = ? AND person_id = ?",
                (self.img_item['id'], old_person_id)
            )
            if not remaining_faces:
                self.app.img_mgr.remove_image_from_person(self.img_item['path'], old_person['folder_name'])
                
            # Reload mappings and index
            self.app.rebuild_faiss_index()
            
            # Refresh
            self.selected_face_idx = None
            self.load_faces()
            self.load_persons_options()
            self.draw_image_on_canvas()
            self.on_update()
            
            messagebox.showinfo("Succès", f"Créé et assigné au nouveau profil : {new_display}.")
        except Exception as e:
            messagebox.showerror("Erreur", f"Erreur de création de profil : {e}")

    def delete_face_link(self):
        if self.selected_face_idx is None:
            return
            
        face_info = self.faces[self.selected_face_idx]
        person_id = face_info['person_id']
        person = self.app.db.get_person(person_id)
        
        if not messagebox.askyesno(
            "Supprimer l'association", 
            f"Voulez-vous supprimer l'association de ce visage avec {person['display_name']} ?"
        ):
            return
            
        try:
            # Delete connection
            self.app.db.remove_image_person_link(self.img_item['id'], person_id, face_info['face_box'])
            
            # Clean up old folder if necessary
            remaining_faces = self.app.db.execute_read(
                "SELECT * FROM ImagePersons WHERE image_id = ? AND person_id = ?",
                (self.img_item['id'], person_id)
            )
            if not remaining_faces:
                self.app.img_mgr.remove_image_from_person(self.img_item['path'], person['folder_name'])
                
            self.selected_face_idx = None
            self.load_faces()
            self.draw_image_on_canvas()
            self.on_update()
            
            messagebox.showinfo("Succès", "Association supprimée.")
        except Exception as e:
            messagebox.showerror("Erreur", f"Erreur de suppression : {e}")
