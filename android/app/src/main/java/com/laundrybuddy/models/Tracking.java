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

    @SerializedName("statusHistory")
    private List<StatusUpdate> statusHistory;

    @SerializedName("createdAt")
    private String createdAt;

    @SerializedName("updatedAt")
    private String updatedAt;

    @SerializedName("estimatedDelivery")
    private String estimatedDelivery;

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
