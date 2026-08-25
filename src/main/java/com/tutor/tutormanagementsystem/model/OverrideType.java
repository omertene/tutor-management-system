package com.tutor.tutormanagementsystem.model;

// one-off change to the teacher's normal weekly schedule
public enum OverrideType {

    BLOCK, // removes time that would normally be free
    ADD    // adds extra free time on top of the normal weekly pattern
}
