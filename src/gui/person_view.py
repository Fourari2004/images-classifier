import os
import tkinter as tk
import customtkinter as ctk
from PIL import Image
from pathlib import Path
from typing import Dict, Any, List, Optional
from tkinter import messagebox, simpledialog

from src.config import config
from src.gui.detail_view import DetailView

class PersonView(ctk.CTkFrame):
    def __init__(self, parent: ctk.CTkFrame, app_root: Any):
        super().__init__(parent, fg_color="transparent")
        self.app = app_root
        
        self.selected_person_id: Optional[int] = None
        self.person_cards: Dict[int, ctk.CTkFrame] = {}
        self.image_tk_cache = [] # Cache to prevent image garbage collection
        self.face_tk_cache = {} # Cache for face thumbnails
        
        # Split layout: Column 0 (Persons list sidebar), Column 1 (Gallery display)
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=4) # Sidebar takes 35%
        self.grid_columnconfigure(1, weight=7) # Gallery takes 65%
        
        # --- LEFT SIDEBAR: Persons List ---
        self.sidebar = ctk.CTkFrame(self)
        self.sidebar.grid(row=0, column=0, padx=(20, 10), pady=20, sticky="nsew")
        self.sidebar.grid_rowconfigure(2, weight=1) # Scroll list fills space
        self.sidebar.grid_columnconfigure(0, weight=1)
        
        # Search Bar
        self.search_entry = ctk.CTkEntry(self.sidebar, placeholder_text="Rechercher par nom...")
        self.search_entry.grid(row=0, column=0, padx=15, pady=(15, 5), sticky="ew")
        self.search_entry.bind("<KeyRelease>", self.on_search)
        
        # Actions Panel (Rename, Merge)
        self.actions_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        self.actions_frame.grid(row=1, column=0, padx=15, pady=5, sticky="ew")
        self.actions_frame.grid_columnconfigure(0, weight=1)
        self.actions_frame.grid_columnconfigure(1, weight=1)
        
        self.rename_btn = ctk.CTkButton(
            self.actions_frame, 
            text="Renommer", 
            state="disabled", 
            command=self.rename_selected_person
        )
        self.rename_btn.grid(row=0, column=0, padx=(0, 5), pady=5, sticky="ew")
        
        self.merge_btn = ctk.CTkButton(
            self.actions_frame, 
            text="Fusionner", 
            state="disabled", 
            command=self.merge_selected_person
        )
        self.merge_btn.grid(row=0, column=1, padx=(5, 0), pady=5, sticky="ew")
        
        # Scrollable list container
        self.list_scroll = ctk.CTkScrollableFrame(self.sidebar)
        self.list_scroll.grid(row=2, column=0, padx=15, pady=(5, 15), sticky="nsew")
        self.list_scroll.grid_columnconfigure(0, weight=1)
        
        # --- RIGHT PANEL: Gallery ---
        self.gallery_frame = ctk.CTkFrame(self)
        self.gallery_frame.grid(row=0, column=1, padx=(10, 20), pady=20, sticky="nsew")
        self.gallery_frame.grid_rowconfigure(1, weight=1)
        self.gallery_frame.grid_columnconfigure(0, weight=1)
        
        # Gallery Header
        self.gallery_header = ctk.CTkFrame(self.gallery_frame, fg_color="transparent")
        self.gallery_header.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="ew")
        self.gallery_header.grid_columnconfigure(0, weight=1)
        
        self.gallery_title = ctk.CTkLabel(
            self.gallery_header, 
            text="Sélectionnez une personne dans la liste", 
            font=ctk.CTkFont(size=20, weight="bold")
        )
        self.gallery_title.grid(row=0, column=0, sticky="w")
        
        self.gallery_subtitle = ctk.CTkLabel(
            self.gallery_header, 
            text="Aucun détail à afficher", 
            text_color="gray50"
        )
        self.gallery_subtitle.grid(row=1, column=0, sticky="w")
        
        # Scrollable image grid
        self.gallery_scroll = ctk.CTkScrollableFrame(self.gallery_frame)
        self.gallery_scroll.grid(row=1, column=0, padx=20, pady=(0, 20), sticky="nsew")
        self.gallery_scroll.grid_columnconfigure(0, weight=1) # Fallback config

    def refresh_data(self):
        """
        Reload persons from the DB and rebuild the list card list.
        """
        search_query = self.search_entry.get().strip()
        persons = self.app.db.get_all_persons(search_query)
        
        # Clear list
        for child in self.list_scroll.winfo_children():
            child.destroy()
            
        self.person_cards = {}
        
        if not persons:
            no_person_lbl = ctk.CTkLabel(self.list_scroll, text="Aucune personne trouvée", text_color="gray50")
            no_person_lbl.grid(row=0, column=0, padx=10, pady=20)
            return

        for idx, p in enumerate(persons):
            p_id = p['id']
            name = p['display_name']
            folder = p['folder_name']
            count = p['photo_count']
            last_seen = p['last_seen']
            
            # Card Container
            card = ctk.CTkFrame(self.list_scroll, fg_color="transparent", border_width=1, border_color=("gray85", "gray25"))
            card.grid(row=idx, column=0, padx=5, pady=5, sticky="ew")
            card.grid_columnconfigure(1, weight=1)
            
            # Click binds to card
            card.bind("<Button-1>", lambda event, pid=p_id: self.select_person(pid))
            
            # Face avatar
            avatar_lbl = ctk.CTkLabel(card, text="👤", font=ctk.CTkFont(size=24))
            avatar_lbl.grid(row=0, column=0, rowspan=2, padx=10, pady=10)
            avatar_lbl.bind("<Button-1>", lambda event, pid=p_id: self.select_person(pid))
            
            # Try to load avatar from thumbnails cache
            self.load_person_avatar_async(p_id, avatar_lbl)
            
            # Text details
            name_lbl = ctk.CTkLabel(card, text=name, font=ctk.CTkFont(weight="bold"), anchor="w")
            name_lbl.grid(row=0, column=1, padx=5, pady=(8, 0), sticky="ew")
            name_lbl.bind("<Button-1>", lambda event, pid=p_id: self.select_person(pid))
            
            seen_text = last_seen.split("T")[0] if last_seen else "Jamais"
            detail_lbl = ctk.CTkLabel(
                card, 
                text=f"{count} photos | Vû(e): {seen_text}", 
                font=ctk.CTkFont(size=11), 
                text_color="gray50",
                anchor="w"
            )
            detail_lbl.grid(row=1, column=1, padx=5, pady=(0, 8), sticky="ew")
            detail_lbl.bind("<Button-1>", lambda event, pid=p_id: self.select_person(pid))
            
            self.person_cards[p_id] = card
            
            # Keep selected card highlighted
            if self.selected_person_id == p_id:
                card.configure(fg_color=("gray85", "gray30"), border_color=ctk.ThemeManager.theme["CTkButton"]["fg_color"])

    def load_person_avatar_async(self, person_id: int, label_widget: ctk.CTkLabel):
        # We find the first face embedding linked to this person in SQLite, crop its face thumbnail
        # and display it.
        # This can run quickly since it's local caching.
        try:
            # Get one image linking to this person
            faces = self.app.db.get_person_images(person_id)
            if not faces:
                return

            face = faces[0]
            sha256 = face['sha256']
            box_str = face['face_box']
            
            thumb_path = self.app.img_mgr.get_face_thumbnail_path(sha256, box_str)
            if not thumb_path.exists():
                # Try creating it
                self.app.img_mgr.create_face_thumbnail(face['path'], sha256, box_str)
                
            if thumb_path.exists():
                pil_img = Image.open(thumb_path)
                # Resize avatar for card
                ctk_avatar = ctk.CTkImage(light_image=pil_img, dark_image=pil_img, size=(45, 45))
                self.face_tk_cache[person_id] = ctk_avatar # cache it
                label_widget.configure(image=ctk_avatar, text="")
        except Exception:
            pass # Keep default placeholder

    def on_search(self, event):
        self.refresh_data()

    def select_person(self, person_id: int):
        self.selected_person_id = person_id
        
        # Reset card selections
        for pid, card in self.person_cards.items():
            if pid == person_id:
                card.configure(fg_color=("gray80", "gray28"), border_color=ctk.ThemeManager.theme["CTkButton"]["fg_color"])
            else:
                card.configure(fg_color="transparent", border_color=("gray85", "gray25"))
                
        # Enable action buttons
        self.rename_btn.configure(state="normal")
        self.merge_btn.configure(state="normal")
        
        # Load gallery of person
        self.load_gallery(person_id)

    def load_gallery(self, person_id: int):
        person = self.app.db.get_person(person_id)
        if not person:
            return
            
        self.gallery_title.configure(text=person['display_name'])
        self.gallery_subtitle.configure(text=f"Dossier interne : {person['folder_name']}")
        
        # Clear grid
        for child in self.gallery_scroll.winfo_children():
            child.destroy()
            
        self.image_tk_cache = []
        
        images = self.app.db.get_person_images(person_id)
        
        if not images:
            no_img_lbl = ctk.CTkLabel(self.gallery_scroll, text="Aucune image pour cette personne", text_color="gray50")
            no_img_lbl.grid(row=0, column=0, padx=10, pady=20)
            return

        # Setup responsive grid cols based on width (approx 4-5 images per row)
        cols_count = 4
        self.gallery_scroll.grid_columnconfigure(list(range(cols_count)), weight=1)
        
        for idx, img in enumerate(images):
            row = idx // cols_count
            col = idx % cols_count
            
            # Thumbnail card
            img_card = ctk.CTkFrame(self.gallery_scroll)
            img_card.grid(row=row, column=col, padx=8, pady=8, sticky="nsew")
            img_card.grid_rowconfigure(0, weight=1)
            img_card.grid_columnconfigure(0, weight=1)
            
            # Bind actions to image card
            img_path = img['path']
            img_card.bind("<Double-Button-1>", lambda event, path=img_path: os.startfile(path))
            
            # Load photo thumbnail
            img_lbl = ctk.CTkLabel(img_card, text="Image", font=ctk.CTkFont(size=14))
            img_lbl.grid(row=0, column=0, padx=10, pady=(10, 5), sticky="nsew")
            img_lbl.bind("<Double-Button-1>", lambda event, path=img_path: os.startfile(path))
            img_lbl.bind("<Button-1>", lambda event, item=img: self.show_detail_overlay(item))
            
            # Right click context menu binding
            img_card.bind("<Button-3>", lambda event, item=img: self.show_context_menu(event, item))
            img_lbl.bind("<Button-3>", lambda event, item=img: self.show_context_menu(event, item))

            self.load_image_thumbnail_async(img_path, img_lbl)
            
            # Label
            name_lbl = ctk.CTkLabel(img_card, text=os.path.basename(img_path), font=ctk.CTkFont(size=10), text_color="gray60")
            name_lbl.grid(row=1, column=0, padx=5, pady=(0, 8))
            name_lbl.bind("<Double-Button-1>", lambda event, path=img_path: os.startfile(path))

    def load_image_thumbnail_async(self, img_path: str, label_widget: ctk.CTkLabel):
        try:
            # We crop the full image or load a resized thumbnail
            # Opening standard 100x100 thumbnail is enough for the gallery
            pil_img = Image.open(img_path)
            pil_img.thumbnail((150, 150), Image.Resampling.LANCZOS)
            ctk_img = ctk.CTkImage(light_image=pil_img, dark_image=pil_img, size=(120, 120))
            self.image_tk_cache.append(ctk_img) # prevent GC
            label_widget.configure(image=ctk_img, text="")
        except Exception:
            label_widget.configure(text="❌ Error")

    def show_detail_overlay(self, img_item: Dict[str, Any]):
        # Open detailed popup view
        popup = DetailView(self.app, img_item, on_update_callback=self.refresh_all_after_change)
        popup.grab_set()

    def show_context_menu(self, event, img_item: Dict[str, Any]):
        # Setup context menu
        menu = tk.Menu(self, tearoff=0)
        menu.add_command(label="Ouvrir dans l'OS", command=lambda: os.startfile(img_item['path']))
        menu.add_command(label="Afficher les détails / rectangles", command=lambda: self.show_detail_overlay(img_item))
        menu.add_separator()
        menu.add_command(
            label="Retirer cette image (Séparation)", 
            command=lambda: self.separate_image_from_person(img_item)
        )
        
        # Display menu at event coordinates
        try:
            menu.tk_popup(event.x_root, event.y_root)
        finally:
            menu.grab_release()

    def rename_selected_person(self):
        if not self.selected_person_id:
            return
            
        person = self.app.db.get_person(self.selected_person_id)
        if not person:
            return
            
        new_name = simpledialog.askstring(
            "Renommer la personne", 
            f"Entrez le nouveau nom pour {person['display_name']} :", 
            initialvalue=person['display_name']
        )
        
        if new_name and new_name.strip():
            new_name = new_name.strip()
            # Generate clean folder name based on new name (replace spaces/special chars)
            # E.g. "Alice Smith" -> "Alice_Smith"
            # Note: We must retain unique folders
            sanitized = "".join([c if c.isalnum() or c in ('-', '_') else '_' for c in new_name])
            folder_name = sanitized
            
            # Keep folder unique
            counter = 1
            original_folder = folder_name
            while True:
                existing = self.app.db.execute_read("SELECT id FROM Persons WHERE folder_name = ? AND id != ?", (folder_name, self.selected_person_id))
                if not existing:
                    break
                folder_name = f"{original_folder}_{counter}"
                counter += 1
                
            # Rename output physical directory
            try:
                self.app.img_mgr.rename_person_folder(person['folder_name'], folder_name)
            except Exception as e:
                messagebox.showerror("Erreur de renommage", f"Impossible de renommer le dossier physique : {e}")
                return
                
            # Update database
            self.app.db.rename_person(self.selected_person_id, new_name, folder_name)
            self.refresh_all_after_change()

    def merge_selected_person(self):
        if not self.selected_person_id:
            return
            
        person = self.app.db.get_person(self.selected_person_id)
        if not person:
            return
            
        # Get list of all other persons to select target
        others = [p for p in self.app.db.get_all_persons() if p['id'] != self.selected_person_id]
        if not others:
            messagebox.showinfo("Fusion impossible", "Il n'y a pas d'autres personnes avec qui fusionner.")
            return
            
        # Create a quick dialog selection
        merge_popup = ctk.CTkToplevel(self)
        merge_popup.title("Fusionner des personnes")
        merge_popup.geometry("450x250")
        merge_popup.resizable(False, False)
        merge_popup.grab_set()
        
        # Center popup
        merge_popup.update_idletasks()
        w = merge_popup.winfo_width()
        h = merge_popup.winfo_height()
        xp = (merge_popup.winfo_screenwidth() // 2) - (w // 2)
        yp = (merge_popup.winfo_screenheight() // 2) - (h // 2)
        merge_popup.geometry(f"+{xp}+{yp}")
        
        lbl = ctk.CTkLabel(
            merge_popup, 
            text=f"Fusionner '{person['display_name']}' vers la personne suivante :",
            font=ctk.CTkFont(weight="bold")
        )
        lbl.pack(padx=20, pady=(20, 10), anchor="w")
        
        # Dropdown selection list
        options_map = {f"{p['display_name']} ({p['folder_name']})": p['id'] for p in others}
        options = list(options_map.keys())
        
        combo = ctk.CTkComboBox(merge_popup, values=options, width=380)
        combo.pack(padx=20, pady=10)
        combo.set(options[0])
        
        warn_lbl = ctk.CTkLabel(
            merge_popup, 
            text="⚠️ Toutes les photos seront transférées et le profil actuel sera supprimé.",
            text_color="orange",
            font=ctk.CTkFont(size=11)
        )
        warn_lbl.pack(padx=20, pady=10)
        
        btn_frame = ctk.CTkFrame(merge_popup, fg_color="transparent")
        btn_frame.pack(padx=20, pady=15, fill="x")
        
        def execute_merge():
            target_id = options_map[combo.get()]
            target_person = self.app.db.get_person(target_id)
            
            # Confirm
            if not messagebox.askyesno(
                "Confirmer la fusion", 
                f"Êtes-vous sûr de vouloir fusionner '{person['display_name']}' "
                f"dans '{target_person['display_name']}' ?"
            ):
                return
                
            try:
                # Get photos of source person to move files physically
                source_images = self.app.db.get_person_images(self.selected_person_id)
                
                # Move files physically
                for img in source_images:
                    # Copy to target person folder (preventing overwrites)
                    self.app.img_mgr.copy_image_to_person(img['path'], target_person['folder_name'])
                    # Delete from old person folder
                    self.app.img_mgr.remove_image_from_person(img['path'], person['folder_name'])
                    
                # Update Database relations (combines records)
                self.app.db.merge_persons(self.selected_person_id, target_id)
                
                # Rebuild FAISS index to purge deleted vectors and link embeddings to target
                self.app.rebuild_faiss_index()
                
                self.selected_person_id = target_id
                merge_popup.destroy()
                
                # Refresh UI
                self.refresh_all_after_change()
                messagebox.showinfo("Fusion réussie", "Les profils ont été fusionnés avec succès.")
            except Exception as e:
                messagebox.showerror("Erreur de fusion", f"Une erreur est survenue pendant la fusion : {e}")
                
        confirm_btn = ctk.CTkButton(btn_frame, text="Fusionner", command=execute_merge)
        confirm_btn.pack(side="right", padx=(5, 0))
        
        cancel_btn = ctk.CTkButton(btn_frame, text="Annuler", fg_color="gray40", hover_color="gray50", command=merge_popup.destroy)
        cancel_btn.pack(side="right", padx=(0, 5))

    def separate_image_from_person(self, img_item: Dict[str, Any]):
        # separation means: remove the link between this image and the selected person
        person = self.app.db.get_person(self.selected_person_id)
        if not person:
            return
            
        if messagebox.askyesno(
            "Confirmer la séparation", 
            f"Voulez-vous retirer cette photo du profil de {person['display_name']} ?"
        ):
            try:
                # Remove file physically from folder
                self.app.img_mgr.remove_image_from_person(img_item['path'], person['folder_name'])
                # Remove link in SQLite
                self.app.db.remove_image_person_link(img_item['id'], self.selected_person_id, img_item['face_box'])
                
                # Rebuild FAISS index is not strictly needed for just removing link, but if we want
                # to delete embeddings we would do it. Here we just break association.
                
                # Refresh gallery
                self.load_gallery(self.selected_person_id)
                self.refresh_data()
            except Exception as e:
                messagebox.showerror("Erreur", f"Erreur lors du retrait de l'image : {e}")

    def refresh_all_after_change(self):
        self.refresh_data()
        if self.selected_person_id:
            self.load_gallery(self.selected_person_id)
        else:
            # Clear gallery if selection was deleted
            self.gallery_title.configure(text="Sélectionnez une personne dans la liste")
            self.gallery_subtitle.configure(text="Aucun détail à afficher")
            for child in self.gallery_scroll.winfo_children():
                child.destroy()
            self.rename_btn.configure(state="disabled")
            self.merge_btn.configure(state="disabled")
