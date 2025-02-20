//
//  VonageVerifySilentAuthModule.m
//  VonageVault
//
//  Created by iujie on 20/02/2025.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VonageVerifySilentAuthModule, NSObject)

RCT_EXTERN_METHOD(
  openWithDataCellular:
  (NSString *) url
  debug: (BOOL *) debug
  resolver: (RCTPromiseResolveBlock) resolve
  rejecter: (RCTPromiseRejectBlock) reject
)

@end
