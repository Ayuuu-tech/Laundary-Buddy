package com.laundrybuddy.db;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

import com.laundrybuddy.models.SupportTicket;

import java.util.List;

@Dao
public interface TicketDao {
    @Query("SELECT * FROM tickets ORDER BY createdAt DESC")
    LiveData<List<SupportTicket>> getAllTickets();

    @Query("SELECT * FROM tickets WHERE id = :id")
    SupportTicket getTicketById(String id);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertTickets(List<SupportTicket> tickets);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertTicket(SupportTicket ticket);

    @Query("DELETE FROM tickets")
    void clearAll();
}
