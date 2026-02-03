package com.laundrybuddy.models;

import com.google.gson.annotations.SerializedName;

import java.util.List;

/**
 * Tracking model matching backend Tracking schema
 */
public class Tracking {

    @SerializedName("_id")
    private String id;

    @SerializedName("orderNumber")
    private String orderNumber;

    @SerializedName("userId")
    private String userId;

    @SerializedName("userName")
    private String userName;

    @SerializedName("hostelRoom")
    private String hostelRoom;

    @SerializedName("status")
    private String status;

    @SerializedName(value = "statusHistory", alternate = { "timeline" })
    private List<StatusUpdate> statusHistory;

    @SerializedName("createdAt")
    private String createdAt;

    @SerializedName("updatedAt")
    private String updatedAt;

    @SerializedName("estimatedDelivery")
    private String estimatedDelivery;

    @SerializedName("order")
    private com.google.gson.JsonElement orderElement;

    // Cached Gson instance with UserFieldAdapter for proper Order parsing
    private static final com.google.gson.Gson orderGson = new com.google.gson.GsonBuilder()
            .registerTypeAdapter(Order.PopulatedUser.class, new UserFieldAdapter())
            .create();

    public Order getOrder() {
        if (orderElement != null && orderElement.isJsonObject()) {
            try {
                return orderGson.fromJson(orderElement, Order.class);
            } catch (Exception e) {
                android.util.Log.e("Tracking", "Error parsing order", e);
                return null;
            }
        }
        return null;
    }

    public String getOrderId() {
        if (orderElement != null) {
            if (orderElement.isJsonPrimitive()) {
                return orderElement.getAsString();
            } else if (orderElement.isJsonObject()) {
                com.google.gson.JsonObject obj = orderElement.getAsJsonObject();
                if (obj.has("_id")) {
                    return obj.get("_id").getAsString();
                }
            }
        }
        return null;
    }

    public void setOrderElement(com.google.gson.JsonElement orderElement) {
        this.orderElement = orderElement;
    }

    // Nested StatusUpdate class
    public static class StatusUpdate {
        @SerializedName("status")
        private String status;

        @SerializedName("timestamp")
        private String timestamp;

        @SerializedName("note")
        private String note;

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(String timestamp) {
            this.timestamp = timestamp;
        }

        public String getNote() {
            return note;
        }

        public void setNote(String note) {
            this.note = note;
        }
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getHostelRoom() {
        return hostelRoom;
    }

    public void setHostelRoom(String hostelRoom) {
        this.hostelRoom = hostelRoom;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<StatusUpdate> getStatusHistory() {
        return statusHistory;
    }

    public void setStatusHistory(List<StatusUpdate> statusHistory) {
        this.statusHistory = statusHistory;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getEstimatedDelivery() {
        return estimatedDelivery;
    }

    public void setEstimatedDelivery(String estimatedDelivery) {
        this.estimatedDelivery = estimatedDelivery;
    }

    @SerializedName("notifyWhenReady")
    private boolean notifyWhenReady;

    public boolean isNotifyWhenReady() {
        return notifyWhenReady;
    }

    public void setNotifyWhenReady(boolean notifyWhenReady) {
        this.notifyWhenReady = notifyWhenReady;
    }

    // Get progress percentage based on status
    public int getProgressPercent() {
        if (status == null)
            return 0;
        switch (status.toLowerCase()) {
            case "pending":
                return 10;
            case "received":
                return 25;
            case "washing":
                return 45;
            case "drying":
                return 60;
            case "folding":
                return 75;
            case "ready":
                return 90;
            case "delivered":
                return 100;
            case "cancelled":
                return 0;
            default:
                return 0;
        }
    }
}
