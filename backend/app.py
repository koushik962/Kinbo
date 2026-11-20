import os
import random
import string
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'kinbo-super-secret-key-2026')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///kinbo.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='CUSTOMER')  # ADMIN or CUSTOMER

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(60), nullable=False)
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=10)
    tag = db.Column(db.String(40), default='TRENDING')
    image_url = db.Column(db.String(500), nullable=False)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_code = db.Column(db.String(20), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # NULL for Guest Order
    customer_name = db.Column(db.String(120), nullable=False)
    customer_phone = db.Column(db.String(30), nullable=False)
    shipping_address = db.Column(db.String(300), nullable=False)
    items_summary = db.Column(db.Text, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(30), default='Pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- Auth Helper ---
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Admin login required'}), 401
        token = auth_header.split(' ')[1]
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            if data.get('role') != 'ADMIN':
                return jsonify({'error': 'Access denied'}), 403
        except Exception:
            return jsonify({'error': 'Invalid or expired token'}), 401
        return f(*args, **kwargs)
    return decorated

def generate_order_code():
    chars = string.ascii_uppercase + string.digits
    return 'KNB-' + ''.join(random.choices(chars, k=6))

# --- Public & Customer Routes ---
@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'brand': 'kinbo'})

@app.route('/api/products', methods=['GET'])
def get_products():
    products = Product.query.order_by(Product.id.desc()).all()
    return jsonify([{
        'id': p.id, 'name': p.name, 'category': p.category,
        'price': p.price, 'stock': p.stock, 'tag': p.tag, 'image_url': p.image_url
    } for p in products])

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    user = User(
        name=data['name'],
        email=data['email'],
        phone=data.get('phone', ''),
        password_hash=generate_password_hash(data['password']),
        role='CUSTOMER'
    )
    db.session.add(user)
    db.session.commit()
    token = jwt.encode({'user_id': user.id, 'role': user.role, 'name': user.name}, app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'token': token, 'user': {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role}})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data.get('email')).first()
    if not user or not check_password_hash(user.password_hash, data.get('password', '')):
        return jsonify({'error': 'Invalid email or password'}), 401
    token = jwt.encode({'user_id': user.id, 'role': user.role, 'name': user.name}, app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'token': token, 'user': {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role}})

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    user_id = None
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            decoded = jwt.decode(auth_header.split(' ')[1], app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = decoded.get('user_id')
        except Exception:
            pass

    order = Order(
        order_code=generate_order_code(),
        user_id=user_id,
        customer_name=data['customer_name'],
        customer_phone=data['customer_phone'],
        shipping_address=data['shipping_address'],
        items_summary=data['items_summary'],
        total_amount=float(data['total_amount'])
    )
    db.session.add(order)
    db.session.commit()
    return jsonify({'message': 'Order placed!', 'order_code': order.order_code, 'is_guest': user_id is None}), 201

@app.route('/api/orders/track/<order_code>', methods=['GET'])
def track_order(order_code):
    order = Order.query.filter_by(order_code=order_code.upper()).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    return jsonify({
        'order_code': order.order_code,
        'customer_name': order.customer_name,
        'items_summary': order.items_summary,
        'total_amount': order.total_amount,
        'status': order.status,
        'created_at': order.created_at.strftime('%Y-%m-%d %H:%M')
    })

# --- Admin Protected Routes ---
@app.route('/api/admin/products', methods=['POST'])
@admin_required
def add_product():
    data = request.json
    p = Product(
        name=data['name'], category=data['category'], price=float(data['price']),
        stock=int(data.get('stock', 10)), tag=data.get('tag', 'NEW DROP'),
        image_url=data['image_url']
    )
    db.session.add(p)
    db.session.commit()
    return jsonify({'message': 'Product added', 'id': p.id}), 201

@app.route('/api/admin/products/<int:pid>', methods=['DELETE'])
@admin_required
def delete_product(pid):
    p = Product.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({'message': 'Deleted'})

@app.route('/api/admin/orders', methods=['GET'])
@admin_required
def all_orders():
    orders = Order.query.order_by(Order.id.desc()).all()
    return jsonify([{
        'id': o.id, 'order_code': o.order_code, 'is_guest': o.user_id is None,
        'customer_name': o.customer_name, 'customer_phone': o.customer_phone,
        'shipping_address': o.shipping_address, 'items_summary': o.items_summary,
        'total_amount': o.total_amount, 'status': o.status
    } for o in orders])

@app.route('/api/admin/orders/<int:oid>/status', methods=['PUT'])
@admin_required
def update_order_status(oid):
    order = Order.query.get_or_404(oid)
    order.status = request.json.get('status', order.status)
    db.session.commit()
    return jsonify({'message': 'Status updated'})

# --- Seed Default Admin & Demo Products ---
with app.app_context():
    db.create_all()
    if not User.query.filter_by(role='ADMIN').first():
        admin = User(
            name='Kinbo Admin',
            email='admin@kinbo.com',
            password_hash=generate_password_hash('admin123'),
            role='ADMIN'
        )
        db.session.add(admin)
    if Product.query.count() == 0:
        demo_products = [
            Product(name='Oversized Acid-Wash Hoodie', category='Streetwear', price=1450, stock=20, tag='HOT DROP',
                    image_url='https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80'),
            Product(name='AeroPulse Wireless ANC Pods', category='Tech Gear', price=2290, stock=15, tag='BESTSELLER',
                    image_url='https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80'),
            Product(name='Urban Sling Crossbody Bag', category='Accessories', price=890, stock=30, tag='LIMITED',
                    image_url='https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80'),
            Product(name='Retro Pixel Desk Clock', category='Room Vibe', price=1150, stock=12, tag='NEW',
                    image_url='https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&q=80')
        ]
        db.session.add_all(demo_products)
    db.session.commit()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

    