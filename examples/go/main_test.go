package main

import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestBase(t *testing.T) {
    for _, raw := range []string{"http://example.com/api/v1", "https://key@example.com/api/v1", "https://example.com/api/v1?key=x"} {
        if _, err := apiBase(raw); err == nil { t.Fatalf("accepted %s", raw) }
    }
    if _, err := apiBase("http://127.0.0.1:8000/api/v1"); err != nil { t.Fatal(err) }
}

func TestRead(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.Header.Get("Authorization") != "Bearer test-key" || r.URL.Path != "/api/v1/me" { t.Error("unexpected request") }
        w.Header().Set("Content-Type", "application/json")
        w.Write([]byte(`{"workspace_id":"example"}`))
    }))
    defer server.Close()
    if _, err := readAPI(newClient(), server.URL + "/api/v1", "test-key", "/me"); err != nil { t.Fatal(err) }
}

func TestRedirectBlocked(t *testing.T) {
    calls := 0
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        calls++
        http.Redirect(w, r, "/leak", http.StatusFound)
    }))
    defer server.Close()
    if _, err := readAPI(newClient(), server.URL + "/api/v1", "test-key", "/me"); err == nil { t.Fatal("redirect accepted") }
    if calls != 1 { t.Fatal("credentials followed redirect") }
}
