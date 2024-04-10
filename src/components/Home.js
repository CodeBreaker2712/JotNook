import React from 'react';
import '../styles/Home.css';
import { IoImages } from 'react-icons/io5';

class Home extends React.Component {
  state = {
    notes: [],
    creatingNote: false,
    uploadingImage: false,
    noteText: "", 
    noteImage: null, 
    selectedNote: null,
  };

  fetchNotes = async () => {
    try {
      const response = await fetch('https://av6sanzysf.execute-api.us-east-1.amazonaws.com/stage-api-triggers-lambda/fetch', {
        method: 'GET', 
        headers: {
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
          },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched notes with signed URLs:', data); 
        this.setState({ notes: data });
      } else {
        throw new Error('Failed to fetch notes');
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  componentDidMount() {
    this.fetchNotes();
  }

  handleNewNote = () => {
    this.setState({ creatingNote: true }); 
  }

  handleNoteTextChange = (event) => {
    this.setState({ noteText: event.target.value });
  }

  handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      this.setState({ noteImage: file }); 
    }
  }

  handleSaveNote = async () => {
    const { noteText, noteImage } = this.state;
    if (noteText && noteImage) {
      this.setState({ uploadingImage: true });
      const timestamp = Date.now();
      const folderName = `uploads/note-${timestamp}`;
      try {
        const base64Image = await this.getBase64(noteImage);
        const noteData = {
          text: noteText,
          image: base64Image,
          folderName: folderName,
        };

        const response = await fetch('https://av6sanzysf.execute-api.us-east-1.amazonaws.com/stage-api-triggers-lambda/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(noteData),
        });

        if (response.ok) {
          console.log('Note successfully saved');
          this.setState({
            creatingNote: false,
            noteText: "",
            noteImage: null,
          });
          this.fetchNotes();
        } else {
          const errorResponse = await response.json();
          throw new Error(errorResponse.message);
        }
      } catch (error) {
        console.error('Error during the save process:', error);
      } finally {
        this.setState({ uploadingImage: false });
      }
    } else {
      console.log('Please add both text and an image to the note.');
    }
  };

  getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result.split(',')[1];
        resolve(base64Image);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  
  uploadText = async (textData) => {
    try {
      const response = await fetch('https://av6sanzysf.execute-api.us-east-1.amazonaws.com/stage-api-triggers-lambda/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textData),
      });
      return response;
    } catch (error) {
      console.error('Error uploading text:', error);
      return { ok: false };
    }
  };
  
  uploadImageToS3 = (file, timestamp) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Image = reader.result.split(',')[1];
          const imageData = {
            image: base64Image,
            folderName: `uploads/note-${timestamp}`,
          };
          const response = await fetch('https://av6sanzysf.execute-api.us-east-1.amazonaws.com/stage-api-triggers-lambda/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(imageData),
          });
          if (response.ok) {
            console.log('Image successfully uploaded');
            resolve(response);
          } else {
            throw new Error('Network response was not ok.');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          reject(error);
        }
      };
      reader.onerror = () => {
        console.error('Error reading image file');
        reject('Error reading image file');
      };
      reader.readAsDataURL(file);
    });
  };
  

  renderNoteCreationCard = () => (
    <div className="note-creation-card">
      <textarea
        placeholder="Type your note here..."
        value={this.state.noteText}
        onChange={this.handleNoteTextChange}
      ></textarea>
      <label htmlFor="file-input" id="file-input-label">
        <IoImages className="paperclip-icon" />
        Attach Image
      </label>
      <input
        id="file-input"
        type="file"
        accept="image/*"
        onChange={this.handleFileInputChange}
      />
      {this.state.uploadingImage && <p>Uploading Image...</p>}
      <button onClick={this.handleSaveNote}>Save Note</button>
    </div>
  );

  getS3ObjectUrl = (key) => {
    return `https://jotnook-bucket.s3.amazonaws.com/${key}`;
  }

  handleNoteClick = (note) => {
    this.setState({ selectedNote: note });
  };

  renderNoteDetailCard = () => {
    const { selectedNote } = this.state;
    if (!selectedNote) return null;
  
    const imageUrl = selectedNote.imageUrl; 
  
    return (
      <div className="note-detail-card">
        <div className="note-image-container">
          <img src={imageUrl} alt="Note" className="note-image" />
        </div>
        <div className="note-text-container">
          <p className="note-text">{selectedNote.text}</p>
        </div>
        <button className="close-button" onClick={() => this.setState({ selectedNote: null })}>
          Close
        </button>
      </div>
    );
  };

  render() {
    return (
      <div className="home-container">
        <header className="header">
          <button onClick={this.handleNewNote}>Create Note</button>
        </header>
        <main className="notes-grid">
        {this.state.creatingNote && this.renderNoteCreationCard()}
        {this.state.notes.map(note => (
            <div key={note.noteId} className="note-card" onClick={() => this.handleNoteClick(note)}>
                <h3>Note {note.noteId}</h3>
                <p>{note.text}</p>
                {note.imageUrl && <img src={note.imageUrl} alt="Note" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />}
            </div>
        ))}
        </main>
        <div style={{ backgroundColor: '#189AB4', marginTop: '20px' }}> 
        </div>
        {this.renderNoteDetailCard()}
        {this.state.selectedNote && <div className="backdrop" onClick={() => this.setState({ selectedNote: null })}></div>}
      </div>
    );
  }  
}

export default Home;
