
import { Customer, DeliveryPartner, ShopOwner } from "../../models/index.js";


export const updateUser = async(req,reply)=>{
    console.log("PATCH /user request received! Body:", req.body);
    try {
        const { userId } = req.user; 
        const updateData = req.body;
    
        let user =
          (await Customer.findById(userId)) ||
          (await DeliveryPartner.findById(userId)) ||
          (await ShopOwner.findById(userId));

        if (!user) {
          return reply.status(404).send({ message: "User not found" });
        }

        let UserModel;

        if (user.role === "Customer") {
            UserModel = Customer;
          } else if (user.role === "DeliveryPartner") {
            UserModel = DeliveryPartner;
          } else if (user.role === "ShopOwner") {
            UserModel = ShopOwner;
          } else {
            return reply.status(400).send({ message: "Invalid user role" });
          }

          // Prevent updating sensitive fields
          delete updateData.password;
          delete updateData.role;
          delete updateData.email;
          delete updateData.googleId;

          const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
          );

          if (!updatedUser) {
            return reply.status(404).send({ message: "User not found" });
          }

          // Strip password from response
          const userObj = updatedUser.toObject();
          delete userObj.password;
      
          return reply.send({
            message: "User updated successfully",
            user: userObj,
          });

    } catch (error) {
        console.error("FAILED TO UPDATE USER ERROR:", error);
        return reply.status(500).send({ message: "Failed to update user", error: error.message || error });
    }
}