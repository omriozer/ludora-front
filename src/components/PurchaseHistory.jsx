import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PurchaseHistory = ({
  title = "היסטוריית רכישות",
  showHeader = true,
  className = ""
}) => {
  const navigate = useNavigate();

  const handleViewPayments = () => {
    navigate('/payments');
  };

  return (
    <div className={`${className}`}>
      <Button
        onClick={handleViewPayments}
        className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-6 py-3 text-base font-medium h-12 rounded-lg shadow-md hover:shadow-lg transition-all"
        size="lg"
      >
        <ShoppingBag className="w-5 h-5 ml-2" />
        צפה בהיסטוריית תשלומים
      </Button>
    </div>
  );
};

export default PurchaseHistory;