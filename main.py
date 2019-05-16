import datetime
import string
import random
from shutil import copyfile
import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy, Model
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from utilities import generateRandomString
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///io.db'
PROJECT_FOLDER = os.path.dirname(os.path.abspath(__file__))
print(PROJECT_FOLDER)

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, unique=True, primary_key=True, nullable=False)
    obf_id = db.Column(db.String(40), unique=True, nullable=False)
    username = db.Column(db.String(30), unique=True, nullable=False)
    email = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(50), nullable=False)
    moniker = db.Column(db.String(50))
    resource_user_art_url = db.Column(db.String(50))
    date_created = db.Column(db.DateTime, default=datetime.datetime.utcnow())

class Artist(db.Model):
    id = db.Column(db.Integer, unique=True, primary_key=True, nullable=False)
    obf_id = db.Column(db.String(40), unique=True, nullable=False)
    moniker = db.Column(db.String(50), unique=True, nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.datetime.utcnow())
    resource_artist_portrait_art_url = db.Column(db.String(50))
    resource_artist_banner_art_url = db.Column(db.String(50))

class Album(db.Model):
    id = db.Column(db.Integer, unique=True, primary_key=True)
    obf_id = db.Column(db.String(40), unique=True, nullable=False)
    name = db.Column(db.String(40))
    artist_id = db.Column(db.Integer, ForeignKey(Artist.id))
    length = db.Column(db.Integer)
    resource_album_art_url = db.Column(db.String(50))
    artist = relationship('Artist', foreign_keys='Album.artist_id')

class Song(db.Model):
    id = db.Column(db.Integer, unique=True, primary_key=True)
    obf_id = db.Column(db.String(40), unique=True)
    title = db.Column(db.String(40))
    artist_id = db.Column(db.Integer, ForeignKey(Artist.id))
    album_id = db.Column(db.Integer, ForeignKey(Album.id))
    resource_song_url = db.Column(db.String(50))
    length = db.Column(db.Integer)

    album = relationship('Album', foreign_keys='Song.album_id')
    artist = relationship('Artist', foreign_keys='Song.artist_id')

def createSingleSong(nameSong, nameArtist, nameAlbum, songURL = None, albumArtExt = "jpg"):
    artistCreated = False
    print('[JOB: CREATE SONG] Searching for artist "' + nameArtist + '"...')
    q_artist = Artist.query.filter_by(moniker=nameArtist).first()

    if(not q_artist):
        print('[JOB: CREATE SONG] Artist "' + nameArtist + '" does not exist. Creating artist...')
        a = Artist(moniker=nameArtist, obf_id=generateRandomString(15))
        db.session.add(a)
        db.session.commit()
        artistCreated = True
        print('[JOB: CREATE SONG] Created artist.')

    if(artistCreated):
        q_artist = Artist.query.filter_by(moniker=nameArtist).first()

    al = Album(name=nameAlbum, artist_id=q_artist.id, obf_id=generateRandomString(15))
    db.session.add(al)
    db.session.commit()

    so = Song(title=nameSong, album_id=al.id, artist_id=al.artist.id, obf_id=generateRandomString(15))

    db.session.add(so)
    db.session.commit()

    RELATIVE_PATH = "\\data\\" + so.artist.obf_id + "\\" + so.album.obf_id + "\\"
    so.resource_song_url = RELATIVE_PATH + so.obf_id + ".mp3"
    al.resource_album_art_url = RELATIVE_PATH + "album." + albumArtExt;
    db.session.commit()

    if(not os.path.exists(PROJECT_FOLDER + RELATIVE_PATH)):
        os.makedirs(PROJECT_FOLDER + RELATIVE_PATH)

    copyfile(PROJECT_FOLDER + songURL, PROJECT_FOLDER + RELATIVE_PATH + so.obf_id + ".mp3")
    copyfile(PROJECT_FOLDER + songURL[:-4] + "." + albumArtExt, PROJECT_FOLDER + RELATIVE_PATH + "album." + albumArtExt)

    print('[JOB: CREATE SONG] Created song.')

# VIEW CALLBACKS
@app.route('/')
def viewIndex():
    return render_template('index.html')

@app.route('/client/songs')
def viewSongs():
    q = Song.query.all()
    return render_template('songs.html', songs=q)

@app.route('/client/artist/<string:artistObfID>')
def viewArtistPage(artistObfID):
    q = Artist.query.filter_by(obf_id=artistObfID).first()
    if(q):
        return render_template("artist.html", artist=q)
    else:
        return "Artist not found."

@app.route('/client/create/artist')
def viewCreateArtistPage():
    return render_template("create_artist.html");

@app.route('/register')
def viewRegister():
    return render_template('register.html')



# API CALLBACKS
@app.route('/api/register', methods=['POST'])
def apiRegisterUser():
    try:
        data = request.get_json()
        randomString = generateRandomString(10)
        u = User(username=data['username'],
                 email=data['email'],
                 password=str(generate_password_hash(str(data['password']))),
                 moniker=data['moniker'],
                 obf_id=randomString)
        db.session.add(u)
        db.session.commit()
        ret = {"status": "success"}
        return jsonify(ret)
    except:
        ret = {"status": "failure"}
        return jsonify(ret)

@app.route('/api/get/song/<int:id>')
def apiGetSong(id):
    try:
        q = Song.query.filter_by(id=id).first()
        ret = {
            "status": "success",
            "song_id": q.id,
            "song_title": q.title,
            "song_artist": q.artist.moniker,
            "song_album": q.album.name,
            "song_audio_url": q.resource_song_url.replace("\\", "/"),
            "song_album_art_url": q.album.resource_album_art_url.replace("\\", "/"),
        }
        return jsonify(ret)
    except:
        ret = {"status": "failure"}
        return jsonify(ret)


@app.route('/data/<path:path>')
def viewRawSong(path):
    return send_from_directory('data', path)
#
# db.create_all()
# createSingleSong("Color", "Grant", "Color - Single", "\\uploads\\01 Color.mp3", "jpg")
# createSingleSong("Clock Catcher (Harp Arrangement)", "Flying Lotus", "Cosmogramma (Alt-Takes)",
#                  "\\uploads\\01 Clock Catcher (Harp Arrangement).mp3", "jpg")
# createSingleSong("All Our Days", "Jeff Williams", "RWBY, Vol. 2 (Music from the Rooster Teeth Series)",
#                  "\\uploads\\06 All Our Days.mp3", "jpg")
# createSingleSong("Midnight Market", "Hong Kong Express", "2047",
#                  "\\uploads\\Hong Kong Express - 2047 - 06 Midnight Market.mp3", "jpg")
# createSingleSong("Disarray", "Bad Computer", "Disarray - Single",
#                  "\\uploads\\Monstercat - Bad Computer - Disarray.mp3", "jpg")
# createSingleSong("Win You Over", "Whethan, Bearson", "Win You Over - Single", "\\uploads\\Whethan - Whethan x Bearson - WIN YOU OVER (Feat. Soak).mp3", "jpg");
# createSingleSong("The Abyss", "Disasterpeace", "Hyper Light Drifter", "\\uploads\\25 The Abyss.mp3", "png");
# createSingleSong("Funknitium-99", "Fearofdark", "Motorway", "\\uploads\\05 Fearofdark - Funknitium-99.mp3", "jpg");
# createSingleSong("When It's Gone (Mat Zo Remix)", "The M Machine, Mat Zo", "Metropolis: The B-Sides", "\\uploads\\When It's Gone (Mat Zo Remix).mp3", "jpg");


if(__name__ == "__main__"):
    app.run(debug=True)
