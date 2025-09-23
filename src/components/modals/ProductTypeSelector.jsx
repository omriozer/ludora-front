import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRODUCT_TYPES } from "@/config/productTypes";

export default function ProductTypeSelector({ onSelect, enabledTypes = ['workshop', 'course', 'file'] }) {
  const availableTypes = Object.values(PRODUCT_TYPES).filter(type => enabledTypes.includes(type.key));

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            בחר סוג המוצר
          </h3>
          <p className="text-gray-600">
            איזה סוג מוצר תרצה ליצור?
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableTypes.map((type) => {
            const IconComponent = type.icon;
            
            return (
              <Button
                key={type.key}
                variant="outline"
                className={`${type.bgColor} ${type.borderColor} hover:${type.bgColor} border-2 p-6 h-auto flex-col space-y-3 transition-all duration-200 hover:shadow-lg hover:scale-105`}
                onClick={() => onSelect(type.key)}
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${type.color} rounded-xl flex items-center justify-center shadow-md`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 text-lg mb-1">
                    {type.singular}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {type.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}