package com.tutor.tutormanagementsystem.config;

import com.tutor.tutormanagementsystem.exception.DemoModeException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/* the single switch for showcase/demo mode (DEMO_ENABLED, off by default).
   while it is on, anyone can sign in as the teacher without a password, so it must only
   be on for a site that holds nothing but fake data. */
@Component
public class DemoMode {

    @Value("${demo.enabled:false}")
    private boolean enabled;

    public boolean isEnabled() {
        return enabled;
    }

    /* the demo endpoints call this first, so with the switch off they answer 404 */
    public void requireEnabled() {
        if (!enabled) {
            throw new DemoModeException("Not found", HttpStatus.NOT_FOUND);
        }
    }

    /* guards actions that would let a visitor lock the real owner out (changing the
       teacher's own email or password) - they are refused while demo mode is on */
    public void blockInDemo(String action) {
        if (enabled) {
            throw new DemoModeException(action + " is disabled in the demo", HttpStatus.BAD_REQUEST);
        }
    }
}
