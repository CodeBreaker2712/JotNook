import React from 'react';
import '../styles/Home.css';
import { IoImages } from 'react-icons/io5';

class Home extends React.Component {
  state = {
    notes: [],
    creatingNote: false,
    uploadingImage: false,
    noteText: "", // Add this to track note text
    noteImage: null, // Add this to track the selected image file
    selectedNote: null,
  };

  fetchNotes = async () => {
    try {
      const response = await fetch('https://av6sanzysf.execute-api.us-east-1.amazonaws.com/stage-api-triggers-lambda/fetch', {
        method: 'GET', // Or 'POST', depending on how your endpoint is configured
        headers: {
            'Content-Type': 'application/json', // Specifies the format of the request's body
            'Accept': 'application/json', // Specifies that the client expects JSON
          },
      });
      if (response.ok) {
        const data = await response.json();
        // Assume that the response is an array of note metadata
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
    this.setState({ creatingNote: true }); // Update state to show the note creation card
  }

  handleNoteTextChange = (event) => {
    this.setState({ noteText: event.target.value });
  }

  handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      this.setState({ noteImage: file }); // Store the file in state
    }
  }

  handleSaveNote = async () => {
    const { noteText, noteImage } = this.state;
    if (noteText && noteImage) {
      this.setState({ uploadingImage: true });
      const timestamp = Date.now();
      const folderName = `uploads/note-${timestamp}`;
      try {
        // Convert image to base64
        const base64Image = await this.getBase64(noteImage);
        const noteData = {
          text: noteText,
          image: base64Image,
          folderName: folderName,
        };

        // Send both text and image in one request
        const response = await fetch('https://av6sanzysf.execute-api.us-east-1.amazonaws.com/stage-api-triggers-lambda/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(noteData),
        });

        if (response.ok) {
          console.log('Note successfully saved');
          // Clear the form and refresh the notes list
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
      {/* Update this label to use the new styles */}
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
      {/* Show loading indicator if uploading */}
      {this.state.uploadingImage && <p>Uploading Image...</p>}
      <button onClick={this.handleSaveNote}>Save Note</button>
    </div>
  );

  getS3ObjectUrl = (key) => {
    // This is a simplification. In a real app, you would want to generate a signed URL using AWS SDK
    // that gives temporary access to the private object. You should NOT make your bucket or objects public.
    return `https://jotnook-bucket.s3.amazonaws.com/${key}`;
  }

  handleNoteClick = (note) => {
    this.setState({ selectedNote: note });
  };

  renderNoteDetailCard = () => {
    const { selectedNote } = this.state;
    if (!selectedNote) return null;

    // Generate the presigned URL for the image (this should be done in your backend)
    const imageUrl = this.getS3ObjectUrl(selectedNote.imageKeys[0]);

    return (
      <div className="note-detail-card">
        <h3>Note Details</h3>
        <img src={imageUrl} alt="Note" />
        <p>Note text or other details here...</p>
        {/* Close button or other UI to deselect the note */}
        <button onClick={() => this.setState({ selectedNote: null })}>
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
              <h3>Note {note.noteId}</h3> {/* Since we don't have title, we use noteId */}
              <p>{note.text}</p> {/* Display the text of the note here */}
              <img src={this.getS3ObjectUrl(note.imageKeys[0])} alt="Note" style={{ width: '100%', borderRadius: '8px' }} />
              {/* More note details or actions could go here */}
            </div>
          ))}
        </main>
        <div style={{ backgroundColor: '#189AB4', marginTop: '20px' }}> {/* This sets the background color for the section below the notes grid */}
          {/* Additional content or footer here */}
        </div>
        {this.renderNoteDetailCard()}
      </div>
    );
  }  
}

export default Home;
