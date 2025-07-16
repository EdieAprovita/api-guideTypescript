const request = require("supertest");
const app = require("../app").default;

async function testEndpoint() {
    console.log("🔍 Testing basic endpoint...");
    
    try {
        const response = await request(app)
            .post("/api/v1/users/register")
            .send({
                username: "testuser",
                email: "test@example.com", 
                password: "Test123ABC\!",
                role: "user"
            })
            .set("User-Agent", "test-agent");
        
        console.log("✅ Status:", response.status);
        console.log("✅ Body:", JSON.stringify(response.body, null, 2));
        console.log("✅ Headers:", response.headers);
        
        if (response.status === 500) {
            console.log("❌ Error 500 detectado");
            console.log("❌ Response text:", response.text);
        }
        
    } catch (error) {
        console.error("❌ Error en la prueba:", error);
    }
}

testEndpoint().then(() => {
    console.log("🏁 Prueba completada");
    process.exit(0);
}).catch(error => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
});
