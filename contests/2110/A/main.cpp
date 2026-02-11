#include <climits>
#include <cmath>
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;

        vector<int> a(n);
        for (int &x : a) cin >> x;

        int minEven=INT_MAX; int maxEven=INT_MIN;
        int minOdd=INT_MAX; int maxOdd=INT_MIN;
        

        for(int x:a){
            if(x&1){
                minOdd= min(minOdd, x);
                maxOdd=max(maxOdd,x);
            }else{
                minEven=min(minEven,x);
                maxEven=max(maxEven,x);
            }
        }

        int ans=n;

        //even-evn
        if(minEven!=INT_MAX){
            int remove=0;
            for(int x:a){
                if(x<minEven||x>maxEven){
                    remove++;
                }
            }
            ans=min(ans,remove);
        }

        //odd odd
        if(minOdd!=INT_MAX){
            int remove=0;
            for( int x: a){

                if(x<minOdd||x>maxOdd){
                    remove++;

                }
            }
            ans=min(ans,remove);
        }
        cout<<ans<<'\n';
    }
    return 0;
}
