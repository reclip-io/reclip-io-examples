// Read-only Reclip discovery example. No jobs, assets or paid requests are created.
package main

import (
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "os"
    "strings"
    "time"
    "unicode"
)

func apiBase(value string) (string, error) {
    if value == "" { value = "https://www.reclip.io/api/v1" }
    value = strings.TrimRight(value, "/")
    u, err := url.Parse(value)
    if err != nil { return "", errors.New("invalid API base") }
    loopback := u.Hostname() == "localhost" || u.Hostname() == "127.0.0.1" || u.Hostname() == "::1"
    if u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.Path != "/api/v1" || (u.Scheme != "https" && !(u.Scheme == "http" && loopback)) {
        return "", errors.New("use HTTPS origin ending in /api/v1, or loopback HTTP")
    }
    return value, nil
}

func readAPI(client *http.Client, base, key, path string) (json.RawMessage, error) {
    if path != "/me" && path != "/tools" && path != "/usage" { return nil, errors.New("unsupported read-only operation") }
    req, err := http.NewRequest(http.MethodGet, base + path, nil)
    if err != nil { return nil, errors.New("invalid API request") }
    req.Header.Set("Authorization", "Bearer " + key)
    req.Header.Set("Accept", "application/json")
    response, err := client.Do(req)
    if err != nil { return nil, errors.New("API transport failed; credentials and response body are not logged") }
    defer response.Body.Close()
    if response.StatusCode < 200 || response.StatusCode >= 300 { return nil, fmt.Errorf("API HTTP %d; check access or Retry-After before resuming", response.StatusCode) }
    const max = 16 * 1024 * 1024
    data, err := io.ReadAll(io.LimitReader(response.Body, max + 1))
    if err != nil || len(data) > max || !json.Valid(data) { return nil, errors.New("invalid, incomplete or oversized API response") }
    return json.RawMessage(data), nil
}

func newClient() *http.Client {
    return &http.Client{Timeout: 30 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}
}

func run() error {
    key := os.Getenv("RECLIP_API_KEY")
    if key == "" || strings.IndexFunc(key, unicode.IsSpace) >= 0 { return errors.New("set RECLIP_API_KEY through your environment or secret manager") }
    base, err := apiBase(os.Getenv("RECLIP_API_BASE_URL"))
    if err != nil { return err }
    result := map[string]json.RawMessage{}
    client := newClient()
    for _, name := range []string{"me", "tools", "usage"} {
        data, err := readAPI(client, base, key, "/" + name)
        if err != nil { return err }
        result[name] = data
    }
    encoder := json.NewEncoder(os.Stdout)
    encoder.SetIndent("", "  ")
    return encoder.Encode(result)
}

func main() {
    if err := run(); err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
}
