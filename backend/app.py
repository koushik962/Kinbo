import os
import uuid
import jwt
import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, "instance")
os.makedirs(INSTANCE_DIR, exist_ok=True)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", f"sqlite:///{os.path.join(INSTANCE_DIR, 'kinbo.db')}"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "kinbo-secret-key-2026")

db = SQLAlchemy(app)


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    category = db.Column(db.String(80), nullable=False)
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=10)
    badge = db.Column(db.String(60), nullable=True)
    image_url = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "price": self.price,
            "stock": self.stock,
            "badge": self.badge,
            "image_url": self.image_url,
            "description": self.description,
        }


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="customer")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
        }


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_code = db.Column(db.String(40), unique=True, nullable=False)
    customer_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(50), nullable=False)
    address = db.Column(db.Text, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(40), nullable=False, default="Placed")
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    items_json = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "order_code": self.order_code,
            "customer_name": self.customer_name,
            "phone": self.phone,
            "address": self.address,
            "total_amount": self.total_amount,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else "",
            "items_json": self.items_json,
        }


def create_token(payload, hours=24):
    data = dict(payload)
    data["exp"] = datetime.datetime.utcnow() + datetime.timedelta(hours=hours)
    return jwt.encode(data, app.config["SECRET_KEY"], algorithm="HS256")


def decode_token(token):
    try:
        return jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
    except Exception:
        return None


def get_bearer_token():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_bearer_token()
        data = decode_token(token) if token else None
        if not data or data.get("role") != "admin":
            return jsonify({"error": "Admin authorization required"}), 401
        return f(*args, **kwargs)
    return decorated


def seed_products():
    sample_products = [
        {
            "title": "Urban Heavyweight Hoodie",
            "category": "Apparel",
            "price": 1850.0,
            "stock": 25,
            "badge": "Trending",
            "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80",
            "description": "420 GSM brushed cotton fleece hoodie with drop-shoulder youth fit.",
        },
        {
            "title": "Street Cargo Joggers",
            "category": "Apparel",
            "price": 1650.0,
            "stock": 20,
            "badge": "New",
            "image_url": "https://images.unsplash.com/photo-1517438476312-10d79c077509?auto=format&fit=crop&w=800&q=80",
            "description": "Breathable ripstop joggers with multi-pocket utility styling.",
        },
        {
            "title": "Oversized Graphic Tee",
            "category": "Apparel",
            "price": 950.0,
            "stock": 40,
            "badge": "Best Seller",
            "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
            "description": "Relaxed boxy fit t-shirt crafted from combed ring-spun cotton.",
        },
        {
            "title": "Varsity Bomber Jacket",
            "category": "Apparel",
            "price": 2750.0,
            "stock": 12,
            "badge": "Drop",
            "image_url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
            "description": "Contrast sleeve varsity jacket designed for cool evening outings.",
        },
        {
            "title": "Cropped Zip Sweatshirt",
            "category": "Apparel",
            "price": 1590.0,
            "stock": 18,
            "badge": "New",
            "image_url": "https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=800&q=80",
            "description": "Two-way zip sweatshirt with structured collar and soft interior.",
        },
        {
            "title": "Pulse ANC Wireless Buds",
            "category": "Tech",
            "price": 2490.0,
            "stock": 30,
            "badge": "Hot",
            "image_url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80",
            "description": "Low-latency wireless earbuds with active noise cancellation and 28h battery.",
        },
        {
            "title": "Retro Mechanical Mini Keyboard",
            "category": "Tech",
            "price": 3850.0,
            "stock": 14,
            "badge": "Creator Pick",
            "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
            "description": "Compact 65% hot-swappable mechanical keyboard with tactile switches.",
        },
        {
            "title": "MagSafe Desk Power Bank 10K",
            "category": "Tech",
            "price": 2200.0,
            "stock": 22,
            "badge": "Essential",
            "image_url": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80",
            "description": "Slim 10,000mAh fast-charging power bank with magnetic snap support.",
        },
        {
            "title": "Studio Over-Ear Headphones",
            "category": "Tech",
            "price": 3290.0,
            "stock": 16,
            "badge": "Trending",
            "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
            "description": "Plush memory-foam earcups with punchy bass for music and gaming.",
        },
        {
            "title": "RGB Creator Desk Lamp",
            "category": "Tech",
            "price": 1790.0,
            "stock": 19,
            "badge": "New",
            "image_url": "https://images.unsplash.com/photo-1534073828943-f801091bb18c?auto=format&fit=crop&w=800&q=80",
            "description": "Asymmetric monitor and desk light bar with adjustable color temperature.",
        },
        {
            "title": "Everyday Tech Sling Bag",
            "category": "Accessories",
            "price": 1350.0,
            "stock": 35,
            "badge": "Best Seller",
            "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
            "description": "Water-resistant crossbody sling with organized pockets for daily gear.",
        },
        {
            "title": "Chunky Street Sneakers",
            "category": "Accessories",
            "price": 3450.0,
            "stock": 15,
            "badge": "Drop",
            "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
            "description": "Cushioned everyday sneakers built for all-day campus and city walks.",
        },
        {
            "title": "Polarized Acetate Sunglasses",
            "category": "Accessories",
            "price": 890.0,
            "stock": 28,
            "badge": "Summer Ready",
            "image_url": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80",
            "description": "UV400 polarized lenses in a lightweight sculpted frame.",
        },
        {
            "title": "Minimalist Stainless Tumbler",
            "category": "Accessories",
            "price": 1150.0,
            "stock": 32,
            "badge": "Essential",
            "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80",
            "description": "Double-wall insulated bottle that keeps drinks cold for 24 hours.",
        },
        {
            "title": "Canvas Tote & Laptop Pouch",
            "category": "Accessories",
            "price": 1250.0,
            "stock": 24,
            "badge": "New",
            "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
            "description": "Heavy canvas everyday tote with padded compartment for up to 15-inch laptop.",
        },
    ]

    existing_titles = {p.title for p in Product.query.all()}
    added = False
    for item in sample_products:
        if item["title"] not in existing_titles:
            db.session.add(Product(**item))
            added = True
    if added:
        db.session.commit()


def seed_admin():
    admin_email = "admin@kinbo.com"
    if not User.query.filter_by(email=admin_email).first():
        admin_user = User(
            name="Kinbo Admin",
            email=admin_email,
            password_hash=generate_password_hash("admin123"),
            role="admin",
        )
        db.session.add(admin_user)
        db.session.commit()


with app.app_context():
    db.create_all()
    seed_products()
    seed_admin()


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "kinbo-api"})


@app.route("/api/products", methods=["GET"])
def get_products():
    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip().lower()

    query = Product.query
    if category and category.lower() != "all":
        query = query.filter(Product.category.ilike(category))

    items = [p.to_dict() for p in query.order_by(Product.id.asc()).all()]
    if search:
        items = [
            p for p in items
            if search in p["title"].lower()
            or search in p["description"].lower()
            or search in p["category"].lower()
        ]
    return jsonify(items)


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or len(password) < 4:
        return jsonify({"error": "Name, valid email, and password (min 4 chars) are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        role="customer",
    )
    db.session.add(user)
    db.session.commit()

    token = create_token({"user_id": user.id, "email": user.email, "role": user.role})
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_token({"user_id": user.id, "email": user.email, "role": user.role})
    return jsonify({"token": token, "user": user.to_dict()})


@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json(force=True) or {}
    customer_name = (data.get("customer_name") or "").strip()
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()
    items = data.get("items") or []

    if not customer_name or not phone or not address or not items:
        return jsonify({"error": "Customer name, phone, address, and items are required"}), 400

    total_amount = 0.0
    normalized_items = []
    for item in items:
        pid = item.get("id") or item.get("product_id")
        qty = int(item.get("quantity") or item.get("qty") or 1)
        if qty < 1:
            continue
        product = Product.query.get(pid)
        if not product:
            continue
        line_total = float(product.price) * qty
        total_amount += line_total
        normalized_items.append({
            "product_id": product.id,
            "title": product.title,
            "price": float(product.price),
            "quantity": qty,
        })

    if not normalized_items:
        return jsonify({"error": "No valid products in order"}), 400

    order_code = f"KNB-{uuid.uuid4().hex[:6].upper()}"
    import json
    order = Order(
        order_code=order_code,
        customer_name=customer_name,
        phone=phone,
        address=address,
        total_amount=total_amount,
        status="Placed",
        items_json=json.dumps(normalized_items),
    )
    db.session.add(order)
    db.session.commit()

    return jsonify(order.to_dict()), 201


@app.route("/api/orders/track/<order_code>", methods=["GET"])
def track_order(order_code):
    code = (order_code or "").strip().upper()
    order = Order.query.filter_by(order_code=code).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order.to_dict())


@app.route("/api/admin/products", methods=["GET", "POST"])
@admin_required
def admin_products():
    if request.method == "GET":
        return jsonify([p.to_dict() for p in Product.query.order_by(Product.id.desc()).all()])

    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    category = (data.get("category") or "Apparel").strip()
    price = float(data.get("price") or 0)
    stock = int(data.get("stock") or 10)
    badge = (data.get("badge") or "").strip() or None
    image_url = (data.get("image_url") or "").strip() or "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"
    description = (data.get("description") or "").strip() or "Fresh youth drop from kinbo."

    if not title or price <= 0:
        return jsonify({"error": "Valid title and positive price are required"}), 400

    product = Product(
        title=title,
        category=category,
        price=price,
        stock=stock,
        badge=badge,
        image_url=image_url,
        description=description,
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@app.route("/api/admin/products/<int:product_id>", methods=["DELETE"])
@admin_required
def delete_admin_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    db.session.delete(product)
    db.session.commit()
    return jsonify({"deleted": True, "id": product_id})


@app.route("/api/admin/orders", methods=["GET"])
@admin_required
def admin_orders():
    orders = Order.query.order_by(Order.id.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@app.route("/api/admin/orders/<int:order_id>/status", methods=["PATCH"])
@admin_required
def update_order_status(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    data = request.get_json(force=True) or {}
    status = (data.get("status") or "").strip()
    if not status:
        return jsonify({"error": "Status is required"}), 400
    order.status = status
    db.session.commit()
    return jsonify(order.to_dict())


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
    