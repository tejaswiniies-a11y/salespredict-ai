import csv
import json
import math
import os
import sys

MODEL_FILE = "model.json"
DEFAULT_DATASET = "sales_data.csv"


def parse_rows(csv_path):
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as file_obj:
        reader = csv.DictReader(file_obj)
        for row in reader:
            rows.append(
                {
                    "marketing_spend": float(row["marketing_spend"]),
                    "store_visitors": float(row["store_visitors"]),
                    "discount": float(row["discount"]),
                    "seasonality_index": float(row["seasonality_index"]),
                    "sales": float(row["sales"]),
                }
            )
    return rows


def average(values):
    return sum(values) / len(values) if values else 0.0


def fit_simple_feature(rows, feature_name):
    xs = [row[feature_name] for row in rows]
    ys = [row["sales"] for row in rows]
    mean_x = average(xs)
    mean_y = average(ys)

    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    denominator = sum((x - mean_x) ** 2 for x in xs)
    slope = numerator / denominator if denominator else 0.0
    intercept = mean_y - slope * mean_x
    predictions = [slope * x + intercept for x in xs]
    mse = average([(pred - y) ** 2 for pred, y in zip(predictions, ys)])
    return {
        "slope": slope,
        "intercept": intercept,
        "mse": mse,
    }


def train_model(csv_path):
    rows = parse_rows(csv_path)
    if not rows:
      raise ValueError("Dataset is empty.")

    features = ["marketing_spend", "store_visitors", "discount", "seasonality_index"]
    feature_models = {feature: fit_simple_feature(rows, feature) for feature in features}

    inverse_mse_sum = 0.0
    for feature in features:
        inverse_mse_sum += 1.0 / max(feature_models[feature]["mse"], 1e-9)

    weights = {}
    for feature in features:
        weights[feature] = (1.0 / max(feature_models[feature]["mse"], 1e-9)) / inverse_mse_sum

    baseline_sales = average([row["sales"] for row in rows])
    baseline_component = baseline_sales * 0.12

    trained = {
        "features": feature_models,
        "weights": weights,
        "baseline_component": baseline_component,
        "trained_on": len(rows),
        "source": os.path.basename(csv_path),
    }

    with open(MODEL_FILE, "w", encoding="utf-8") as file_obj:
        json.dump(trained, file_obj, indent=2)

    return {
        "success": True,
        "message": "Model trained successfully.",
        "trained_on": len(rows),
        "model_file": MODEL_FILE,
        "source": os.path.basename(csv_path),
    }


def ensure_model():
    if os.path.exists(MODEL_FILE):
        return
    train_model(DEFAULT_DATASET)


def predict_sales(marketing_spend, store_visitors, discount, seasonality_index):
    ensure_model()
    with open(MODEL_FILE, "r", encoding="utf-8") as file_obj:
        model = json.load(file_obj)

    values = {
        "marketing_spend": marketing_spend,
        "store_visitors": store_visitors,
        "discount": discount,
        "seasonality_index": seasonality_index,
    }

    prediction = model["baseline_component"]
    for feature_name, value in values.items():
        feature_model = model["features"][feature_name]
        component = feature_model["slope"] * value + feature_model["intercept"]
        prediction += model["weights"][feature_name] * component

    prediction = max(0.0, prediction)

    return {
        "success": True,
        "predicted_sales": round(prediction, 2),
        "model": {
            "trained_on": model["trained_on"],
            "source": model["source"],
        },
    }


def main():
    command = sys.argv[1] if len(sys.argv) > 1 else "train"

    try:
        if command == "train":
            csv_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_DATASET
            result = train_model(csv_path)
            print(json.dumps(result))
            return

        if command == "predict":
            if len(sys.argv) < 6:
                raise ValueError("predict requires 4 feature values.")

            result = predict_sales(
                float(sys.argv[2]),
                float(sys.argv[3]),
                float(sys.argv[4]),
                float(sys.argv[5]),
            )
            print(json.dumps(result))
            return

        raise ValueError("Unsupported command. Use train or predict.")
    except Exception as error:
        print(json.dumps({"success": False, "message": str(error)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
